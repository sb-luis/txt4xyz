package relay

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/coder/websocket"
)

func newTestServer(t *testing.T, opts ...Option) (*httptest.Server, *Relay) {
	t.Helper()
	rel := New(opts...)
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		conn, err := websocket.Accept(w, r, &websocket.AcceptOptions{InsecureSkipVerify: true})
		if err != nil {
			return
		}
		rel.Join(r.Context(), conn) //nolint:errcheck
	}))
	t.Cleanup(srv.Close)
	return srv, rel
}

func dial(t *testing.T, srv *httptest.Server, roomID string) *websocket.Conn {
	t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	url := "ws" + srv.URL[len("http"):]
	conn, _, err := websocket.Dial(ctx, url, nil)
	if err != nil {
		t.Fatalf("dial: %v", err)
	}
	t.Cleanup(func() { conn.Close(websocket.StatusNormalClosure, "") })

	if err := conn.Write(ctx, websocket.MessageBinary, []byte(roomID)); err != nil {
		t.Fatalf("send room id: %v", err)
	}
	return conn
}

func readOne(t *testing.T, conn *websocket.Conn, timeout time.Duration) (websocket.MessageType, []byte) {
	t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()
	typ, data, err := conn.Read(ctx)
	if err != nil {
		t.Fatalf("read: %v", err)
	}
	return typ, data
}

func expectNoMessage(t *testing.T, conn *websocket.Conn, within time.Duration) {
	t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), within)
	defer cancel()
	_, _, err := conn.Read(ctx)
	if err == nil {
		t.Fatalf("expected no message within %s, but got one", within)
	}
}

func TestBroadcastReachesOthersNotSender(t *testing.T) {
	srv, rel := newTestServer(t)
	a := dial(t, srv, "room-a")
	b := dial(t, srv, "room-a")
	waitForRoomMembers(t, rel, "room-a", 2)

	payload := []byte{0x01, 0x02, 0x03, 0xff}
	if err := a.Write(context.Background(), websocket.MessageBinary, payload); err != nil {
		t.Fatalf("write: %v", err)
	}

	typ, data := readOne(t, b, 5*time.Second)
	if typ != websocket.MessageBinary {
		t.Fatalf("got message type %v, want binary", typ)
	}
	if string(data) != string(payload) {
		t.Fatalf("got %v, want %v", data, payload)
	}

	expectNoMessage(t, a, 200*time.Millisecond)
}

func TestRoomsAreIsolated(t *testing.T) {
	srv, _ := newTestServer(t)
	a := dial(t, srv, "room-a")
	x := dial(t, srv, "room-x")

	if err := a.Write(context.Background(), websocket.MessageBinary, []byte("hello")); err != nil {
		t.Fatalf("write: %v", err)
	}

	expectNoMessage(t, x, 200*time.Millisecond)
}

func TestLateJoinerReceivesSubsequentBroadcasts(t *testing.T) {
	srv, rel := newTestServer(t)
	a := dial(t, srv, "room-a")
	waitForRoomMembers(t, rel, "room-a", 1)

	late := dial(t, srv, "room-a")
	waitForRoomMembers(t, rel, "room-a", 2)

	payload := []byte("after the late joiner arrived")
	if err := a.Write(context.Background(), websocket.MessageBinary, payload); err != nil {
		t.Fatalf("write: %v", err)
	}

	_, data := readOne(t, late, 5*time.Second)
	if string(data) != string(payload) {
		t.Fatalf("got %v, want %v", data, payload)
	}
}

func TestEmptyRoomIsDeleted(t *testing.T) {
	srv, rel := newTestServer(t)
	a := dial(t, srv, "room-a")
	b := dial(t, srv, "room-a")

	waitForRoomCount(t, rel, 1)

	a.Close(websocket.StatusNormalClosure, "")
	b.Close(websocket.StatusNormalClosure, "")

	waitForRoomCount(t, rel, 0)
}

func waitForRoomMembers(t *testing.T, rel *Relay, roomID string, want int) {
	t.Helper()
	deadline := time.Now().Add(5 * time.Second)
	for time.Now().Before(deadline) {
		if rel.roomSize(roomID) == want {
			return
		}
		time.Sleep(10 * time.Millisecond)
	}
	t.Fatalf("room %q never reached %d members", roomID, want)
}

func waitForRoomCount(t *testing.T, rel *Relay, want int) {
	t.Helper()
	deadline := time.Now().Add(5 * time.Second)
	for time.Now().Before(deadline) {
		if rel.roomCount() == want {
			return
		}
		time.Sleep(10 * time.Millisecond)
	}
	t.Fatalf("room count never reached %d, still %d", want, rel.roomCount())
}

func TestNonBinaryFrameClosesConnection(t *testing.T) {
	srv, _ := newTestServer(t)
	conn := dial(t, srv, "room-a")

	if err := conn.Write(context.Background(), websocket.MessageText, []byte("{}")); err != nil {
		t.Fatalf("write: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if _, _, err := conn.Read(ctx); err == nil {
		t.Fatal("expected connection to be closed after a non-binary frame")
	}
}

func TestOversizedFrameClosesConnection(t *testing.T) {
	srv, _ := newTestServer(t, WithMaxMessageSize(16))
	conn := dial(t, srv, "room-a")

	oversized := make([]byte, 1024)
	if err := conn.Write(context.Background(), websocket.MessageBinary, oversized); err != nil {
		t.Fatalf("write: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if _, _, err := conn.Read(ctx); err == nil {
		t.Fatal("expected connection to be closed after an oversized frame")
	}
}

func TestRateLimitExceededClosesConnection(t *testing.T) {
	srv, _ := newTestServer(t, WithRateLimit(2, 2))
	conn := dial(t, srv, "room-a")

	for i := 0; i < 10; i++ {
		if err := conn.Write(context.Background(), websocket.MessageBinary, []byte("x")); err != nil {
			break
		}
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if _, _, err := conn.Read(ctx); err == nil {
		t.Fatal("expected connection to be closed after exceeding the rate limit")
	}
}

func TestRoomFullRejectsExtraMember(t *testing.T) {
	srv, rel := newTestServer(t, WithMaxRoomSize(2))
	a := dial(t, srv, "room-a")
	b := dial(t, srv, "room-a")
	waitForRoomMembers(t, rel, "room-a", 2)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	extra := dialRaw(t, srv)
	if err := extra.Write(ctx, websocket.MessageBinary, []byte("room-a")); err != nil {
		t.Fatalf("write room id: %v", err)
	}
	_, _, err := extra.Read(ctx)
	if err == nil {
		t.Fatal("expected the third member's connection to be closed")
	}
	if code := websocket.CloseStatus(err); code != 4001 {
		t.Fatalf("got close code %d, want 4001", code)
	}

	payload := []byte("still works")
	if err := a.Write(context.Background(), websocket.MessageBinary, payload); err != nil {
		t.Fatalf("write: %v", err)
	}
	_, data := readOne(t, b, 5*time.Second)
	if string(data) != string(payload) {
		t.Fatalf("got %v, want %v", data, payload)
	}
}

func TestRoomCapNotStickyAfterLeave(t *testing.T) {
	srv, rel := newTestServer(t, WithMaxRoomSize(1))
	a := dial(t, srv, "room-a")
	waitForRoomMembers(t, rel, "room-a", 1)

	a.Close(websocket.StatusNormalClosure, "")
	waitForRoomMembers(t, rel, "room-a", 0)
	waitForRoomCount(t, rel, 0)

	b := dial(t, srv, "room-a")
	waitForRoomMembers(t, rel, "room-a", 1)
	_ = b
}

func TestMaxRoomsRejectsNewRoomButNotExistingJoin(t *testing.T) {
	srv, rel := newTestServer(t, WithMaxRooms(1), WithMaxRoomSize(5))
	a := dial(t, srv, "room-a")
	waitForRoomMembers(t, rel, "room-a", 1)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	extra := dialRaw(t, srv)
	if err := extra.Write(ctx, websocket.MessageBinary, []byte("room-b")); err != nil {
		t.Fatalf("write room id: %v", err)
	}
	_, _, err := extra.Read(ctx)
	if err == nil {
		t.Fatal("expected new-room join to be rejected")
	}
	if code := websocket.CloseStatus(err); code != 4002 {
		t.Fatalf("got close code %d, want 4002", code)
	}

	b := dial(t, srv, "room-a")
	waitForRoomMembers(t, rel, "room-a", 2)
	_ = a
	_ = b
}

func dialRaw(t *testing.T, srv *httptest.Server) *websocket.Conn {
	t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	url := "ws" + srv.URL[len("http"):]
	conn, _, err := websocket.Dial(ctx, url, nil)
	if err != nil {
		t.Fatalf("dial: %v", err)
	}
	t.Cleanup(func() { conn.Close(websocket.StatusNormalClosure, "") })
	return conn
}

func TestInvalidRoomIDClosesConnection(t *testing.T) {
	srv, _ := newTestServer(t)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	url := "ws" + srv.URL[len("http"):]
	conn, _, err := websocket.Dial(ctx, url, nil)
	if err != nil {
		t.Fatalf("dial: %v", err)
	}
	defer conn.Close(websocket.StatusNormalClosure, "")

	if err := conn.Write(ctx, websocket.MessageBinary, []byte("has a space")); err != nil {
		t.Fatalf("write: %v", err)
	}

	if _, _, err := conn.Read(ctx); err == nil {
		t.Fatal("expected connection to be closed after an invalid room id")
	}
}
