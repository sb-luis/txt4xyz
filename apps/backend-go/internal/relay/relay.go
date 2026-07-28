// Package relay implements an ephemeral, in-memory websocket relay for
// collaborative documents. It knows nothing about Yjs, CRDTs, or any other
// document format: once a connection has joined a room, every subsequent
// frame it sends is forwarded byte-for-byte to that room's other members and
// nothing else. A room exists only while it has members; the last one
// leaving deletes it.
package relay

import (
	"context"
	"errors"
	"sync"
	"time"

	"github.com/coder/websocket"
)

const (
	defaultMaxMessageSize = 2 * 1024 * 1024
	defaultRateLimit      = 40.0
	defaultRateBurst      = 80
	defaultMaxRoomSize    = 8
	defaultMaxRooms       = 256

	sendBufferSize = 16
	joinTimeout    = 10 * time.Second
	pingInterval   = 20 * time.Second
	pingTimeout    = 10 * time.Second
	writeTimeout   = 10 * time.Second
)

var (
	errClosed     = errors.New("relay: shutting down")
	errRoomFull   = errors.New("relay: room full")
	errAtCapacity = errors.New("relay: server at capacity")
)

// Option configures a Relay built by New.
type Option func(*Relay)

// WithMaxMessageSize caps the size, in bytes, of any single frame. Larger
// frames close the connection instead of being truncated or dropped.
func WithMaxMessageSize(n int64) Option {
	return func(r *Relay) { r.maxMessageSize = n }
}

// WithRateLimit caps the sustained rate of inbound frames per connection to
// eventsPerSecond, allowing bursts up to burst. Exceeding it closes the
// connection.
func WithRateLimit(eventsPerSecond float64, burst int) Option {
	return func(r *Relay) { r.rateLimit = eventsPerSecond; r.rateBurst = burst }
}

// WithMaxRoomSize caps the number of members a single room may hold. A join
// that would exceed it is rejected instead of admitted.
func WithMaxRoomSize(n int) Option {
	return func(r *Relay) { r.maxRoomSize = n }
}

// WithMaxRooms caps the number of distinct rooms held in memory at once.
// Joining an existing room is unaffected; only creating a new one is capped.
func WithMaxRooms(n int) Option {
	return func(r *Relay) { r.maxRooms = n }
}

// Relay holds every room currently in memory. The zero value is not usable;
// construct one with New.
type Relay struct {
	mu      sync.Mutex
	rooms   map[string]*room
	members map[*member]struct{}
	wg      sync.WaitGroup
	closed  bool

	maxMessageSize int64
	rateLimit      float64
	rateBurst      int
	maxRoomSize    int
	maxRooms       int
}

// New builds a ready-to-use Relay with no rooms.
func New(opts ...Option) *Relay {
	r := &Relay{
		rooms:          make(map[string]*room),
		members:        make(map[*member]struct{}),
		maxMessageSize: defaultMaxMessageSize,
		rateLimit:      defaultRateLimit,
		rateBurst:      defaultRateBurst,
		maxRoomSize:    defaultMaxRoomSize,
		maxRooms:       defaultMaxRooms,
	}
	for _, opt := range opts {
		opt(r)
	}
	return r
}

// Join takes ownership of an already-upgraded connection: it reads the room
// ID from the first frame, then relays every frame after that to, and only
// to, the other members of the same room. It blocks until the connection
// closes and always leaves it closed on return.
func (r *Relay) Join(ctx context.Context, conn *websocket.Conn) error {
	conn.SetReadLimit(r.maxMessageSize)

	roomCtx, cancel := context.WithTimeout(ctx, joinTimeout)
	roomID, err := readRoomID(roomCtx, conn)
	cancel()
	if err != nil {
		conn.Close(websocket.StatusCode(4003), "invalid room id")
		return err
	}

	m := newMember(conn, r.rateLimit, r.rateBurst)

	rm, leave, err := r.enter(roomID, m)
	if err != nil {
		switch {
		case errors.Is(err, errRoomFull):
			conn.Close(websocket.StatusCode(4001), "room full")
		case errors.Is(err, errAtCapacity):
			conn.Close(websocket.StatusCode(4002), "server at capacity")
		default:
			conn.Close(websocket.StatusGoingAway, "server shutting down")
		}
		return err
	}
	defer leave()

	go m.writePump()
	go m.keepAlive(ctx)

	m.readPump(ctx, rm.broadcast)
	return nil
}

// Shutdown closes every open connection with a going-away code, so clients
// reconnect and re-sync against a new server, then waits for their Join
// calls to finish or ctx to expire, whichever comes first. Call it once,
// after the HTTP server has stopped accepting new connections.
func (r *Relay) Shutdown(ctx context.Context) error {
	r.mu.Lock()
	r.closed = true
	members := make([]*member, 0, len(r.members))
	for m := range r.members {
		members = append(members, m)
	}
	r.mu.Unlock()

	for _, m := range members {
		m.closeConn(websocket.StatusGoingAway, "server shutting down")
	}

	done := make(chan struct{})
	go func() {
		r.wg.Wait()
		close(done)
	}()

	select {
	case <-done:
		return nil
	case <-ctx.Done():
		return ctx.Err()
	}
}

// roomCount reports the number of rooms currently in memory. It exists for
// tests that need to assert an empty room was actually deleted.
func (r *Relay) roomCount() int {
	r.mu.Lock()
	defer r.mu.Unlock()
	return len(r.rooms)
}

// roomSize reports how many members roomID currently has. It exists for
// tests that need to wait for a Join to actually complete registration
// before exercising broadcast ordering; the wire protocol has no join-ack.
func (r *Relay) roomSize(roomID string) int {
	r.mu.Lock()
	rm, ok := r.rooms[roomID]
	r.mu.Unlock()
	if !ok {
		return 0
	}
	rm.mu.Lock()
	defer rm.mu.Unlock()
	return len(rm.members)
}

func (r *Relay) enter(roomID string, m *member) (*room, func(), error) {
	r.mu.Lock()
	if r.closed {
		r.mu.Unlock()
		return nil, nil, errClosed
	}

	rm, ok := r.rooms[roomID]
	created := false
	if !ok {
		if len(r.rooms) >= r.maxRooms {
			r.mu.Unlock()
			return nil, nil, errAtCapacity
		}
		rm = &room{members: make(map[*member]struct{})}
		r.rooms[roomID] = rm
		created = true
	}
	rm.mu.Lock()
	if len(rm.members) >= r.maxRoomSize {
		rm.mu.Unlock()
		if created {
			delete(r.rooms, roomID)
		}
		r.mu.Unlock()
		return nil, nil, errRoomFull
	}
	rm.members[m] = struct{}{}
	rm.mu.Unlock()

	r.members[m] = struct{}{}
	r.wg.Add(1)
	r.mu.Unlock()

	leave := func() {
		rm.mu.Lock()
		delete(rm.members, m)
		empty := len(rm.members) == 0
		rm.mu.Unlock()

		r.mu.Lock()
		delete(r.members, m)
		if empty && r.rooms[roomID] == rm {
			delete(r.rooms, roomID)
		}
		r.mu.Unlock()

		m.closeConn(websocket.StatusNormalClosure, "")
		close(m.send)
		r.wg.Done()
	}
	return rm, leave, nil
}

// room is the set of connections relaying to each other under one room ID.
type room struct {
	mu      sync.Mutex
	members map[*member]struct{}
}

// broadcast forwards data, unmodified, to every member of rm except sender.
// A member whose send buffer is full is closed rather than skipped: losing a
// CRDT update silently means permanent divergence.
func (rm *room) broadcast(sender *member, data []byte) {
	rm.mu.Lock()
	defer rm.mu.Unlock()
	for m := range rm.members {
		if m == sender {
			continue
		}
		m.enqueue(data)
	}
}
