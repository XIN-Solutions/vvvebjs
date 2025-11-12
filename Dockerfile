FROM caddy:2-alpine

RUN rm -f /usr/share/caddy/index.html
COPY . /usr/share/caddy


RUN cat <<'EOF' > /etc/caddy/Caddyfile
:80 {
    root * /usr/share/caddy
    file_server


    # Basic CORS setup
    header {
        Access-Control-Allow-Origin  *
        Access-Control-Allow-Methods "GET, POST, OPTIONS"
        Access-Control-Allow-Headers "Origin, Content-Type, Accept, Authorization"
        Access-Control-Expose-Headers "Content-Length, Content-Range"
        Access-Control-Max-Age 3600
    }

    # Handle preflight requests explicitly
    @options {
        method OPTIONS
    }
    respond @options 204
}

EOF