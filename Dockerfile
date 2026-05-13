# syntax=docker/dockerfile:1
FROM caddy:2-alpine

RUN rm -f /usr/share/caddy/index.html
COPY . /usr/share/caddy
RUN rm -f /usr/share/caddy/Caddyfile
COPY Caddyfile /etc/caddy/Caddyfile