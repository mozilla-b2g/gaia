import pprint
import json
import sys
import os

import reporters
from twisted.internet import reactor
from autobahn.websocket import WebSocketServerFactory, \
                               WebSocketServerProtocol, \
                               listenWS

class TestAgentServer(WebSocketServerProtocol):

    def __init__(self):
        self.increment = 0;
        self.envs = {};
        self.pending_envs = [];

    def emit(self, event, data):
        command = (event, data);
        self.sendMessage(json.dumps(command));

    def on_envs_complete(self):
        names = [];
        exitCode = 0;

        for env in self.envs:
            if (self.envs[env].failures > 0):
                exitCode = 1;

            print '\ntest report: (' + env + ')'
            print '\n'.join(self.envs[env].output)

        # XXX: this is really horrible in some ways but
        #      it gives the impression of a simple test runner.
        reactor.stop()

        # This seems a bit weird to me is the right way?
        try:
            sys.exit(exitCode)
        except(SystemExit):
            pass

    def handle_event(self, event, data):
        if event == 'set test envs':
            self.pending_envs = data[0];

        if event == 'test data':
            # the 'test data' event is a nested event
            # inside of the main event body. It is a direct
            # copy of the mocha reporter data with the addition
            # of the 'testAgentEnvId' which is used to group
            # the results of different test runs.
            (test_event, test_data) = json.loads(data[0]);

            # gaia & test agent both use environment ids because
            # they nest test runners. This is a very special case
            # most test agent runners will not do this so add a
            # fallback environment name to make this simpler.
            if ('testAgentEnvId' in test_data):
                test_env = test_data['testAgentEnvId'];
            else:
                test_env = 'global';

            # add to pending
            if (test_event == 'start'):
                self.envs[test_env] = reporters.Spec(stream = False);

            # don't process out of order commands
            if not (test_env in self.envs):
                return;

            self.envs[test_env].handle_event(test_event, test_data);

            # remove from pending and trigger test complete check.
            if (test_event == 'end'):
                idx = self.pending_envs.index(test_env);
                del self.pending_envs[idx];

                # now that envs are totally complete show results.
                if (len(self.pending_envs) == 0):
                    self.on_envs_complete();


    def onOpen(self):
        self.increment = self.increment + 1;
        tests = sys.argv[1:len(sys.argv)];
        self.run_tests(tests);

    def run_tests(self, tests):
        def format(value):
            if (value[0] != '/'):
                value = '/' + value
            return value

        tests = map(format, tests)
        self.emit('run tests', { 'tests': tests });

    def onMessage(self, data, binary):
        command = json.loads(data)
        # test agent protocol always uses the [event, data] format.
        self.handle_event(command[0], [command[1]])


if __name__ == '__main__':
    factory = WebSocketServerFactory("ws://localhost:8789")
    factory.protocol = TestAgentServer
    listenWS(factory)
    reactor.run()

