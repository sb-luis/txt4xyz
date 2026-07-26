package relay

import (
	"context"
	"errors"

	"github.com/coder/websocket"
)

const maxRoomIDLen = 128

var (
	errRoomIDFrameType = errors.New("relay: first frame was not binary")
	errRoomIDInvalid   = errors.New("relay: room id failed validation")
)

// readRoomID reads exactly one frame — the first the client sends after
// connecting — and treats its raw bytes as the room ID. It is read nowhere
// else: the URL and query string carry nothing sensitive, so this is the
// only place a room ID ever touches server logic.
func readRoomID(ctx context.Context, conn *websocket.Conn) (string, error) {
	typ, data, err := conn.Read(ctx)
	if err != nil {
		return "", err
	}
	if typ != websocket.MessageBinary {
		return "", errRoomIDFrameType
	}
	if !validRoomID(data) {
		return "", errRoomIDInvalid
	}
	return string(data), nil
}

// validRoomID reports whether b is a non-empty, bounded-length, URL-safe
// token. Room IDs are opaque bearer credentials to the server; this only
// bounds their shape, it never assigns them meaning.
func validRoomID(b []byte) bool {
	if len(b) == 0 || len(b) > maxRoomIDLen {
		return false
	}
	for _, c := range b {
		if !isURLSafeByte(c) {
			return false
		}
	}
	return true
}

func isURLSafeByte(c byte) bool {
	switch {
	case c >= 'a' && c <= 'z':
		return true
	case c >= 'A' && c <= 'Z':
		return true
	case c >= '0' && c <= '9':
		return true
	case c == '-' || c == '_':
		return true
	default:
		return false
	}
}
