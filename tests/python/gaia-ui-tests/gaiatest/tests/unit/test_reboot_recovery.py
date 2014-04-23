# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time
from gaiatest import GaiaTestCase
from marionette.errors import InvalidResponseException

class TestRebootRecover(GaiaTestCase):

    def test_reboot_recovery(self):
        '''
        There are many types of crash but this is representative and one we can invoke easily.
        We unexpectedly stop the b2g process and try to send a marionette command.
        It should pass and the remainder of the suite pass
        '''

        if self.device.is_android_build:
            # device/emulator
            self.device.manager.shellCheckOutput(['stop', 'b2g'])
            time.sleep(2)
            self.device.manager.shellCheckOutput(['start', 'b2g'])
        elif self.marionette.instance:
            # desktopb2g gecko instance
            self.marionette.instance.close()
            time.sleep(1)
            self.marionette.instance.start()

        with self.assertRaises(InvalidResponseException):
            self.marionette.find_element('tag name', 'body')
