#!/usr/bin/env python3
"""Static dev server with caching disabled (so edits always load).

Binds dual-stack (IPv6 '::' with V6ONLY off) so it answers both
http://127.0.0.1 and http://[::1] — Chrome resolves `localhost` to ::1
first on Windows, and an IPv4-only bind leaves the preview tab stranded
on a connection-refused error page.
"""
import http.server, socketserver, socket, sys, os

os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8741


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        self.send_header('Expires', '0')
        super().end_headers()

    def log_message(self, *a):
        pass


class DualStackServer(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    address_family = socket.AF_INET6  # '::' accepts IPv6...

    def server_bind(self):
        # ...and IPv4-mapped addresses too, once V6ONLY is cleared.
        try:
            self.socket.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
        except (AttributeError, OSError):
            pass
        super().server_bind()


with DualStackServer(('::', PORT), NoCacheHandler) as httpd:
    print('serving on http://localhost:%d (dual-stack)' % PORT)
    httpd.serve_forever()
