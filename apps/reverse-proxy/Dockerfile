FROM caddy:2.11.4-alpine

COPY Caddyfile /etc/caddy/Caddyfile

RUN caddy fmt --overwrite /etc/caddy/Caddyfile

# Exec form: shell form would run caddy under /bin/sh, which does not forward
# SIGTERM, so Railway redeploys would SIGKILL instead of draining.
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
