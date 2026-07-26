package relay

import (
	"context"
	"sync"
	"time"

	"github.com/coder/websocket"
)

// member is one connection's state within the relay: its outbound buffer,
// its inbound rate limiter, and the plumbing to close it exactly once.
type member struct {
	conn      *websocket.Conn
	send      chan []byte
	limiter   *tokenBucket
	closeOnce sync.Once
}

func newMember(conn *websocket.Conn, rate float64, burst int) *member {
	return &member{
		conn:    conn,
		send:    make(chan []byte, sendBufferSize),
		limiter: newTokenBucket(rate, burst),
	}
}

// enqueue hands data to the connection's write pump. If the pump can't keep
// up, the connection is closed rather than the message dropped: for a CRDT
// update, a silent drop is permanent divergence, so backpressure must
// surface as a reconnect instead.
func (m *member) enqueue(data []byte) {
	select {
	case m.send <- data:
	default:
		m.closeConn(websocket.StatusPolicyViolation, "slow consumer")
	}
}

func (m *member) closeConn(code websocket.StatusCode, reason string) {
	m.closeOnce.Do(func() {
		m.conn.Close(code, reason)
	})
}

func (m *member) writePump() {
	for data := range m.send {
		ctx, cancel := context.WithTimeout(context.Background(), writeTimeout)
		err := m.conn.Write(ctx, websocket.MessageBinary, data)
		cancel()
		if err != nil {
			return
		}
	}
}

func (m *member) keepAlive(ctx context.Context) {
	t := time.NewTicker(pingInterval)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-t.C:
			pingCtx, cancel := context.WithTimeout(ctx, pingTimeout)
			err := m.conn.Ping(pingCtx)
			cancel()
			if err != nil {
				m.closeConn(websocket.StatusPolicyViolation, "ping timeout")
				return
			}
		}
	}
}

// readPump blocks reading frames until the connection ends, forwarding each
// one to broadcast. It never inspects a frame's content, only its type, size
// (enforced by the Conn's read limit), and arrival rate.
func (m *member) readPump(ctx context.Context, broadcast func(*member, []byte)) {
	for {
		typ, data, err := m.conn.Read(ctx)
		if err != nil {
			return
		}
		if typ != websocket.MessageBinary {
			m.closeConn(websocket.StatusUnsupportedData, "binary frames only")
			return
		}
		if !m.limiter.allow(time.Now()) {
			m.closeConn(websocket.StatusPolicyViolation, "rate limit exceeded")
			return
		}
		broadcast(m, data)
	}
}
