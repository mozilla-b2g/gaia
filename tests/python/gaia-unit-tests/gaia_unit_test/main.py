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
import traceback

import reporters


class TestAgentServer(tornado.websocket.WebSocketHandler):

    increment = 0
    envs = {}
    pending_envs = []
    passes = 0
    failures = 0
    current_test = None

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
        self.tests = tests
        self.run_next_test()

    def run_next_test(self):
        self.current_test = self.tests.pop()
        self.emit('run tests', {'tests': ["/%s" % self.current_test] })

    def on_envs_complete(self):
        exitCode = 0
        if self.failures or not self.passes:
            # Magic non-zero value to match the expectations of the mozharness
            # script.
            exitCode = 10

        for env in self.envs:
            if len(self.envs[env].output):
                print '\ntest report: (' + env + ')'
                print '\n'.join(self.envs[env].output)

        self.close()
        self.runner.cleanup()

        self.logger.info('passed: %d' % self.passes)
        self.logger.info('failed: %d' % self.failures)
        self.logger.info('todo: 0')

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

            self.envs[test_env].handle_event(test_event, test_data, self.current_test)

            # remove from pending and trigger test complete check.
            if (test_event == 'end'):
                idx = self.pending_envs.index(test_env)
                del self.pending_envs[idx]

                self.passes += self.envs[test_env].passes
                self.failures += self.envs[test_env].failures

                if self.tests:
                    self.run_next_test()

                # now that envs are totally complete show results.
                elif (len(self.pending_envs) == 0):
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
        # Read in a list of tests to skip from disabled.json, if it exists;
        # disabled.json should contain filenames with paths relative to the
        # apps directory, e.g., "wallpaper/test/unit/pick_test.js".
        disabled = []
        disabled_file = os.path.join(os.path.dirname(__file__), 'disabled.json')
        if os.access(disabled_file, os.F_OK):
            with open(disabled_file, 'r') as f:
                disabled_contents = f.read()
                try:
                    disabled = json.loads(disabled_contents)
                except:
                    traceback.print_exc()
                    print "Error while decoding disabled.json; please make sure this file has valid JSON syntax."
                    sys.exit(1)

        # build a list of tests
        appsdir = os.path.join(os.path.dirname(os.path.abspath(options.profile)), 'apps')
        for root, dirs, files in os.walk(appsdir):
            for file in files:
                # only include tests in a 'unit' directory
                roots = root.split(os.path.sep)
                if 'unit' in roots:
                    full_path = os.path.relpath(os.path.join(root, file), appsdir)
                    if full_path.endswith('_test.js') and full_path not in disabled:
                        tests.append(full_path)

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
