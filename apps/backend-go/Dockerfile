FROM golang:1.26.5-alpine3.24 AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 go build -o /relay .

FROM alpine:3.24.1 AS runner

RUN adduser -D -u 10001 relay
COPY --from=builder /relay /usr/local/bin/relay
USER relay

# Exec form: shell form would run the binary under /bin/sh, which does not
# forward SIGTERM, so Railway redeploys would SIGKILL instead of letting the
# graceful shutdown in main.go drain websockets.
CMD ["/usr/local/bin/relay"]
