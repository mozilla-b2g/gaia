# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import os
import sys
import textwrap
import time

from yoctopuce.yocto_api import YAPI, YRefParam
from yoctopuce.yocto_current import YCurrent
from yoctopuce.yocto_datalogger import YDataLogger

class GaiaOptionsMixin(object):

    def gaia_verify_usage(self, options, tests):
        if options.yocto:
            # need to verify that the yocto ammeter is attached
            errmsg = YRefParam()
            if YAPI.RegisterHub("usb", errmsg) != YAPI.SUCCESS:
                raise RuntimeError('could not register yocto usb connection: %s' % str(errmsg))

            # rescan for yocto devices
            if YAPI.UpdateDeviceList(errmsg) != YAPI.SUCCESS:
                raise RuntimeError('could not detect yoctopuce modules: %s' % str(errmsg))

            # check for ammeter
            ammeter = YCurrent.FirstCurrent()
            if ammeter is None:
                raise RuntimeError('could not find ammeter device')
            if ammeter.isOnline():
                module = ammeter.get_module()
                dc_ammeter = YCurrent.FindCurrent(module.get_serialNumber() + '.current1')
                if (not module.isOnline()) or (dc_ammeter is None):
                    raise RuntimeError('could not get ammeter device')
            else:
                raise RuntimeError('could not find yocto ammeter device')

            # check for data logger
            data_logger = YDataLogger.FirstDataLogger()
            if data_logger is None :
                raise RuntimeError('could not find data logger device')
            if data_logger.isOnline():
                module = data_logger.get_module()
                data_logger = YDataLogger.FindDataLogger(module.get_serialNumber() + '.dataLogger')
                if not module.isOnline() or data_logger is None:
                    raise RuntimeError('could not get data logger device')
            else:
                raise RuntimeError('could not find yocto ammeter device')

    def __init__(self, **kwargs):
        # Inheriting object must call this __init__ to set up option handling
        group = self.add_option_group('gaiatest')
        group.add_option('--restart',
                         action='store_true',
                         dest='restart',
                         default=False,
                         help='restart target instance between tests')
        group.add_option('--yocto',
                         action='store_true',
                         dest='yocto',
                         default=False,
                         help='collect voltage and amperage during test runs (requires special hardware)')
        self.verify_usage_handlers.append(self.gaia_verify_usage)


class GaiaTestRunnerMixin(object):

    def __init__(self, **kwargs):
        width = 80
        if not (self.testvars.get('acknowledged_risks') is True or os.environ.get('GAIATEST_ACKNOWLEDGED_RISKS')):
            url = 'https://developer.mozilla.org/en-US/docs/Gaia_Test_Runner#Risks'
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

