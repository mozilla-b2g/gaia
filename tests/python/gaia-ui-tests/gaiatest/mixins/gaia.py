# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import os
import sys
import textwrap
import time


class GaiaOptionsMixin(object):

    def __init__(self, **kwargs):
        # Inheriting object must call this __init__ to set up option handling
        group = self.add_option_group('gaiatest')
        group.add_option('--restart',
                         action='store_true',
                         dest='restart',
                         default=False,
                         help='restart target instance between tests')

        # when this parameter is not set, the test will run with the currently set language on the phone
        group.add_option('--locale',
                         default="undefined",
                         help="locale for the device, "
                                "This value overrides the value from testvars.json file")

class GaiaTestRunnerMixin(object):
    
    def __init__(self, **kwargs):
        width = 80
        if not (self.testvars.get('acknowledged_risks') is True or os.environ.get('GAIATEST_ACKNOWLEDGED_RISKS')):
            url = 'http://gaiatest.readthedocs.org/en/latest/testrunner.html#risks'
            heading = 'Acknowledge risks'
            message = 'These tests are destructive and may remove data from the target Firefox OS instance as well ' \
                      'as using services that may incur costs! Before you can run these tests you must follow the ' \
                      'steps to indicate you have acknowledged the risks detailed at the following address:'
            print '\n' + '*' * 5 + ' %s ' % heading.upper() + '*' * (width - len(heading) - 7)
            print '\n'.join(textwrap.wrap(message, width))
            print url
            print '*' * width + '\n'
            sys.exit(1)
        if not (self.testvars.get('skip_warning') is True or os.environ.get('GAIATEST_SKIP_WARNING')):
            delay = 30
            heading = 'Warning'
            message = 'You are about to run destructive tests against a Firefox OS instance. These tests ' \
                      'will restore the target to a clean state, meaning any personal data such as contacts, ' \
                      'messages, photos, videos, music, etc. will be removed. This may include data on the ' \
                      'microSD card. The tests may also attempt to initiate outgoing calls, or connect to ' \
                      'services such as cellular data, wifi, gps, bluetooth, etc.'
            try:
                print '\n' + '*' * 5 + ' %s ' % heading.upper() + '*' * (width - len(heading) - 7)
                print '\n'.join(textwrap.wrap(message, width))
                print '*' * width + '\n'
                print 'To abort the test run hit Ctrl+C on your keyboard.'
                print 'The test run will continue in %d seconds.' % delay
                time.sleep(delay)
            except KeyboardInterrupt:
                print '\nTest run aborted by user.'
                sys.exit(1)
            print 'Continuing with test run...\n'

