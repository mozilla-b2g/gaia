# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from functools import wraps
import json
import os
import tempfile

from mozrunner import B2GDesktopRunner
from mozprofile import Profile
import corredor

def call_handlers(func):
    @wraps(func)
    def _(cls, data):
        handler_name = '%s_handlers' % func.__name__[3:]
        handlers = getattr(cls, handler_name, [])
        for handler in handlers:
            handler(data)
        return func(cls, data)
    return _

class SocketListener(object):
    def __init__(self):
        self.worker = corredor.ExclusivePair()
        self.worker.bind('ipc:///tmp/marionette_socket_host_worker')
        self.runner = None

        self.results = []
        self.sink = corredor.Subscriber()
        self.sink.bind('ipc:///tmp/mocha_tbpl_reporter_sink')

        self.sink.subscribe('test_end', self.on_test_end)
        self.sink.subscribe('test_start', self.on_test_start)
        self.sink.subscribe('test_status', self.on_test_status)
        self.sink.subscribe('fin', self.on_fin)

        # register callback on profile action
        self.worker.register_action('start_runner', self.on_start_runner)
        self.worker.register_action('stop_runner', self.on_stop_runner)


    def poll(self):
        corredor.eventloop.poll((self.worker, self.sink))

    def add_runner_handler(self, rhandler):
        for action in ['start_runner', 'stop_runner']:
            handler_name = '%s_handlers' % action
            if not hasattr(self, handler_name):
                setattr(self, handler_name, [])
            getattr(self, handler_name).append(getattr(rhandler, action))

    @call_handlers
    def on_test_end(self, data):
        print 'TEST-END | %s' % data['test']
        self.results.append(data)

    @call_handlers
    def on_test_start(self, data):
        print 'TEST-START | %s' % data['test']

    @call_handlers
    def on_test_status(self, data):
        print 'TEST-STATUS | %s | %s' % (data['subtest'], data['status'])

    @call_handlers
    def on_fin(self, data):
        corredor.eventloop.stop()
        self.cleanup()

    @call_handlers
    def on_start_runner(self, data):
        self.worker.send_json({'action': 'ready_start'})

    @call_handlers
    def on_stop_runner(self, data):
        self.worker.send_json({'action': 'ready_stop'})

    def cleanup(self):
        self.sink.cleanup()
        self.worker.cleanup()
