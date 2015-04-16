# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import PasscodeTestCase
from gaiatest.apps.lockscreen.app import LockScreen

class TestLockScreen(PasscodeTestCase):
    def setUp(self):
        GaiaTestCase.setUp(self)

        self.set_passcode_to_1337()

        self.data_layer.set_setting('lockscreen.passcode-lock.enabled', True)

        # this time we need it locked!
        self.device.lock()

    def test_unlock_to_emergency_call_screen(self):
        lock_screen = LockScreen(self.marionette)
        lock_screen.switch_to_frame()
        passcode_pad = lock_screen.unlock_to_passcode_pad()
        emergency_call = passcode_pad.tap_emergency_call()
        emergency_call.switch_to_emergency_call_frame()
        self.assertTrue(emergency_call.is_emergency_dialer_keypad_displayed,
                       'emergency dialer keypad is not displayed')
