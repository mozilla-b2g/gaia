import SimpleHTTPServer;
import SocketServer;

class CustomHTTPRequestHandler(SimpleHTTPServer.SimpleHTTPRequestHandler):
    def do_GET(self):
        host = self.headers['Host']
        if ":" in host:
            host = host.split(':')[0]
        if "." in host:
            host = host.split('.')[0]
        if host != 'local':
            self.path = 'apps/' + host + self.path
        print(self.path)
        SimpleHTTPServer.SimpleHTTPRequestHandler.do_GET(self)

httpd = SocketServer.TCPServer(("", 8000), CustomHTTPRequestHandler)

httpd.serve_forever()

