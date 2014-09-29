# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import sys

from .arguments import GaiaIntegrationParser
from .handlers import runner_handlers
from .listener import SocketListener

def cli(args=sys.argv[1:]):
    parser = GaiaIntegrationParser()
    args = parser.parse_args(args)

    rhandler_args = {
        'symbols_path': args.symbols_path,
    }
    if args.b2g_home:
        rhandler_args['b2g_home'] = args.b2g_home
    if args.buildapp == 'device':
        rhandler_args.update({'serial': args.device_serial})
    rhandler = runner_handlers[args.buildapp](**rhandler_args)

    listener = SocketListener()
    listener.add_runner_handler(rhandler)

    try:
        listener.poll()
    finally:
        listener.cleanup()
        #rhandler.cleanup()

if __name__ == '__main__':
    sys.exit(cli())
