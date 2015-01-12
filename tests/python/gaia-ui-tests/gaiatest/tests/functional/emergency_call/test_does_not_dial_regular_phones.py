# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.lockscreen.app import LockScreen


class TestEmergencyCall(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

        self.data_layer.set_setting('lockscreen.passcode-lock.enabled', True)
        self.device.lock()

    def test_does_not_dial_regular_phones(self):
        """
        https://moztrap.mozilla.org/manage/case/15186/
        """
        lock_screen = LockScreen(self.marionette)
        lock_screen.switch_to_frame()
        passcode_pad = lock_screen.unlock_to_passcode_pad()

        emergency_call = passcode_pad.tap_emergency_call()
        emergency_call.switch_to_emergency_call_frame()
        emergency_call.keypad.dial_phone_number(self.testvars['remote_phone_number'])
        emergency_call.keypad.tap_call_button(switch_to_call_screen=False)

        self.assertTrue(emergency_call.is_emergency_call_only_title_displayed)
