# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import signal

from marionette import expectedFailure
from marionette import SkipTest
from marionette import Wait

from gaiatest import GaiaTestCase


class TestCrash(GaiaTestCase):

    @expectedFailure
    def test_crash(self):
        '''Test crash detection.'''
        if self.device.is_desktop_b2g:
            if not self.marionette.instance:
                raise SkipTest('Unable to crash an independently started B2G '
                               'desktop instance')
            else:
                self.marionette.instance.runner.stop(signal.SIGABRT)
        else:
            self.marionette.runner.stop(signal.SIGABRT)
            Wait(self.marionette).until(lambda m: m.check_for_crash())
        self.assertTrue(self.marionette.check_for_crash())
