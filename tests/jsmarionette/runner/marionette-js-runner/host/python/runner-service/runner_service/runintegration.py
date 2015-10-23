# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from argparse import ArgumentParser
import threading
import sys
import socket
import os
import time

import SocketServer

from .listener import RequestHandler

class Server(SocketServer.ThreadingMixIn, SocketServer.UnixStreamServer):
    pass

def cli(args=sys.argv[1:]):
    '''
    Begin the server note that the majority of arguments will be passed via the
    cli but over the unix socket instead...
    '''
    parser = ArgumentParser()
    parser.add_argument('--path',
        dest='path',
        default='/tmp/marionette_socket_host_worker',
        help='Path to bind unix socket to'
    )
    args = parser.parse_args(args)

    # Make sure the socket does not already exist.
    try:
        # XXX: This is potentially a bad thing maybe we should raise or warn
        # here...
        os.unlink(args.path)
    except OSError:
        if os.path.exists(args.path):
            raise

    server = Server(args.path, RequestHandler)
    server_thread = threading.Thread(target=server.serve_forever)

    server_thread.deamon = True
    server.running = True
    server_thread.start()

if __name__ == '__main__':
    sys.exit(cli())
