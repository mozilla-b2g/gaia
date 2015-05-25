# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import socket
import sys
import os
import json
import uuid
import BaseHTTPServer
import traceback
import mozcrash

from .handlers import runner_handlers

class RequestHandler(BaseHTTPServer.BaseHTTPRequestHandler):
    REQUESTS = {}
    INACTIVE = []

    def log_message(self, format, *args):
        '''
        Override log message to bypass certain behaviors which assume tcp
        sockets
        '''
        pass

    def log_error(self, format, *args):
        '''
        Override log error to bypass certain behaviors which assume tcp
        sockets
        '''
        print(args)

    def send_json(self, status, payload):
        '''
        Respond to incoming http request...

        :param int status:
        :param dict payload: payload to send as json to the socket.
        '''
        payload = json.dumps(payload)
        self.send_response(status)
        self.send_header('Content-Length', len(payload))
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(payload)

    def do_GET(self):
        pass

    def do_POST(self):
        content_length = self.headers.getheader('content-length', 0)
        payload = json.loads(self.rfile.read(int(content_length)))
        handler = self.path[1:]
        method = 'do_' + handler

        # No matter what we send application/json
        if hasattr(self, method):
            try:
                func = getattr(self, method)
                result = func(payload)
            except Exception as e:
                self.send_json(500, {
                    'message': str(e),
                    'stack': traceback.format_exc()
                })
            else:
                self.send_json(200, result)
        else:
            self.send_json(404, { message: 'Unknown path :' + self.path })


    def do_test_end(self, data):
        print 'TEST-END | %s' % data['test']

    def do_test_start(self, data):
        print 'TEST-START | %s' % data['test']

    def do_test_status(self, data):
        print 'TEST-STATUS | %s | %s' % (data['subtest'], data['status'])

    def do_connect(self, payload):
        '''
        Simple connection ready hook to signal socket readiness...
        '''
        return {}

    def do_get_crash_info(self, payload):
        # Somewhat terrible (maybe) hack to get CrashInfo private interface.
        crash_info = mozcrash.mozcrash.CrashInfo(**payload)

        # Return first error or nothing...
        for info in crash_info:
            return {
                'signature': info.signature,
                'stackwalk_stdout': info.stackwalk_stdout,
                'stackwalk_stderr': info.stackwalk_stderr,
                'stackwalk_retcode': info.stackwalk_retcode,
                'stackwalk_errors': info.stackwalk_errors
            }

        return {}

    def do_start_runner(self, payload):
        '''
        Begin a runner

        :param str|None binary: Target binary (usually b2g-bin) for desktop.
        :param dict options: Options specific to the buildapp type.
        '''
        binary = payload.get('binary')
        options = payload.get('options', {})

        handler_args = {
            'symbols_path': options.get('symbols_path')
        }

        if 'b2g_home' in options:
            handler_args['b2g_home'] = options['b2g_home']

        if options['buildapp'] == 'device' and 'serial' in options:
            handler_args['serial'] = options['serial']

        if 'dump_path' in options:
            handler_args['dump_path'] = options['dump_path']

        start_id = str(uuid.uuid4())
        handler = runner_handlers[options['buildapp']](**handler_args)
        handler.start_runner(binary, options)

        self.REQUESTS[start_id] = handler

        return { 'id': start_id }

    def do_stop_runner(self, payload):
        payload_id = payload['id']
        if not payload_id in self.REQUESTS:
            if payload_id in self.INACTIVE:
                sys.stderr.write(
                    'Received request to stop ' +
                    payload_id +
                    ' but already stopped so nothing to do.\n')
                return {}
            runner_ids = str.join(
                ', ',
                map(lambda x: str(x), self.REQUESTS.keys() + self.INACTIVE))
            msg = 'Cannot stop %s - service has %s' % (payload_id, runner_ids)
            raise Exception(msg)

        self.INACTIVE.append(payload_id)
        handler = self.REQUESTS.pop(payload_id)
        handler.stop_runner()
        handler.cleanup()
        return {}
