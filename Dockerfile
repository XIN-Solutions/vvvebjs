FROM caddy:2-alpine
COPY . /usr/share/caddy

RUN <<'EOF' > /etc/caddy/Caddyfile
:80 {
    root * /usr/share/caddy
    file_server
}
EOF