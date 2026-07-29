// txt4xyz backend: a websocket relay for collaborative Yjs documents. Rooms
// are ephemeral and in-memory; the server relays opaque binary blobs between
// participants and has no database, no auth, and no CRDT logic of its own.
package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/coder/websocket"

	"github.com/sb-luis/txt4xyz/apps/backend-go/internal/relay"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "4000"
	}

	origins, insecureSkipVerify := parseOrigins(os.Getenv("ALLOWED_ORIGINS"))
	rel := relay.New()

	mux := http.NewServeMux()
	mux.HandleFunc("GET /ws", func(w http.ResponseWriter, r *http.Request) {
		conn, err := websocket.Accept(w, r, &websocket.AcceptOptions{
			OriginPatterns:     origins,
			InsecureSkipVerify: insecureSkipVerify,
		})
		if err != nil {
			log.Printf("websocket accept: %v", err)
			return
		}
		if err := rel.Join(r.Context(), conn); err != nil {
			log.Printf("relay join ended: %v", err)
		}
	})

	// Slowloris protection. Safe for /ws: Accept hijacks the connection, and
	// coder/websocket manages its own deadlines via context from there.
	srv := &http.Server{
		Addr:              ":" + port,
		Handler:           mux,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      10 * time.Second,
		IdleTimeout:       120 * time.Second,
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	serveErr := make(chan error, 1)
	go func() {
		log.Printf("server on :%s", port)
		serveErr <- srv.ListenAndServe()
	}()

	select {
	case err := <-serveErr:
		if err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("listen: %v", err)
		}
	case <-ctx.Done():
		log.Print("shutdown signal received")
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		if err := srv.Shutdown(shutdownCtx); err != nil {
			log.Printf("http shutdown: %v", err)
		}
		// http.Server.Shutdown does not track connections hijacked out from
		// under it (every open websocket), so the relay closes those itself.
		if err := rel.Shutdown(shutdownCtx); err != nil {
			log.Printf("relay shutdown: %v", err)
		}
	}
}

// parseOrigins reads a comma-separated ALLOWED_ORIGINS. Empty means local
// dev: skip origin verification entirely rather than pass a "*" pattern,
// which coder/websocket deliberately rejects as a footgun.
func parseOrigins(raw string) (patterns []string, insecureSkipVerify bool) {
	if raw == "" {
		return nil, true
	}
	for _, o := range strings.Split(raw, ",") {
		if o = strings.TrimSpace(o); o != "" {
			patterns = append(patterns, o)
		}
	}
	return patterns, false
}
