import json
import logging
import mozlog
from mozrunner import Runner
from optparse import OptionParser
import os
import shutil
import sys
import tempfile
import tornado.websocket
import tornado.ioloop
import tornado.httpserver

import reporters


class TestAgentServer(tornado.websocket.WebSocketHandler):

    increment = 0
    envs = {}
    pending_envs = []
    passes = 0
    failures = 0

    def initialize(self, tests=None, runner=None, logger=None):
        self.tests = tests
        self.runner = runner
        self.logger = logger

    def emit(self, event, data):
        command = (event, data)
        self.write_message(json.dumps(command))

    def open(self):
        self.increment = self.increment + 1
        self.run_tests(self.tests)

    def run_tests(self, tests):
        def format(value):
            if (value[0] != '/'):
                value = '/' + value
            return value

        tests = map(format, tests)
        self.emit('run tests', {'tests': tests})

    def on_envs_complete(self):
        exitCode = 0

        for env in self.envs:
            if (self.envs[env].failures > 0):
                exitCode = 1

            if len(self.envs[env].output):
                print '\ntest report: (' + env + ')'
                print '\n'.join(self.envs[env].output)

        self.close()
        self.runner.cleanup()

        self.logger.info('Passed: %d' % self.passes)
        self.logger.info('Failed: %d' % self.failures)
        self.logger.info('Todo: 0')

        sys.exit(exitCode)

    def handle_event(self, event, data):
        if event == 'set test envs':
            self.pending_envs = data[0]

        if event == 'test data':
            # the 'test data' event is a nested event
            # inside of the main event body. It is a direct
            # copy of the mocha reporter data with the addition
            # of the 'testAgentEnvId' which is used to group
            # the results of different test runs.
            (test_event, test_data) = json.loads(data[0])

            # gaia & test agent both use environment ids because
            # they nest test runners. This is a very special case
            # most test agent runners will not do this so add a
            # fallback environment name to make this simpler.
            if ('testAgentEnvId' in test_data):
                test_env = test_data['testAgentEnvId']
            else:
                test_env = 'global'

            # add to pending
            if (test_event == 'start'):
                self.envs[test_env] = reporters.TBPLLogger(stream=False,
                                                           logger=self.logger)

            # don't process out of order commands
            if not (test_env in self.envs):
                return

            self.envs[test_env].handle_event(test_event, test_data)

            # remove from pending and trigger test complete check.
            if (test_event == 'end'):
                idx = self.pending_envs.index(test_env)
                del self.pending_envs[idx]

                self.passes += self.envs[test_env].passes
                self.failures += self.envs[test_env].failures

                # now that envs are totally complete show results.
                if (len(self.pending_envs) == 0):
                    self.on_envs_complete()

    def on_close(self):
        print "Closed down"
        sys.exit(1)

    def on_message(self, message):
        command = json.loads(message)
        # test agent protocol always uses the [event, data] format.
        self.handle_event(command[0], [command[1]])


class GaiaUnitTestRunner(object):

    def __init__(self, binary=None, profile=None):
        self.binary = binary
        self.profile = profile

    def run(self):
        self.profile_dir = os.path.join(tempfile.mkdtemp(suffix='.gaiaunittest'),
                                        'profile')
        shutil.copytree(self.profile, self.profile_dir)

        self.runner = Runner.create(binary=self.binary,
                                    profile_args={'profile': self.profile_dir},
                                    clean_profile=False,
                                    cmdargs=['--runapp', 'Test Agent'])
        self.runner.start()

    def cleanup(self):
        self.runner.cleanup()
        shutil.rmtree(os.path.dirname(self.profile_dir))

    __del__ = cleanup


def cli():
    parser = OptionParser(usage='%prog [options] <test_file> <test_file> ...')
    parser.add_option("--binary",
                      action="store", dest="binary",
                      default=None,
                      help="path to B2G desktop build binary")
    parser.add_option("--profile",
                      action="store", dest="profile",
                      default=None,
                      help="path to gaia profile directory")

    options, tests = parser.parse_args()

    if not options.binary or not options.profile:
        parser.print_usage()
        parser.exit('--binary and --profile required')

    if not tests:
        # build a list of tests
        appsdir = os.path.join(os.path.dirname(os.path.abspath(options.profile)), 'apps')
        for root, dirs, files in os.walk(appsdir):
            for file in files:
                if file[-8:] == '_test.js':
                    tests.append(os.path.relpath(os.path.join(root, file), appsdir))

    runner = GaiaUnitTestRunner(binary=options.binary,
                                profile=options.profile)
    runner.run()

    # Lame but necessary hack to prevent tornado's logger from duplicating
    # every message from mozlog.
    logger = logging.getLogger()
    handler = logging.NullHandler()
    logger.addHandler(handler)

    print 'starting WebSocket Server'
    application = tornado.web.Application([
        (r"/", TestAgentServer, {'tests': tests,
                                 'runner': runner,
                                 'logger': mozlog.getLogger('gaia-unit-tests')}),
    ])
    http_server = tornado.httpserver.HTTPServer(application)
    http_server.listen(8789)
    tornado.ioloop.IOLoop.instance().start()

if __name__ == '__main__':
    cli()
