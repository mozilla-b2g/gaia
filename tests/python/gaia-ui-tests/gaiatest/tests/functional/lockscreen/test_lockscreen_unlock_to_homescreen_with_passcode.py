# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import PasscodeTestCase, GaiaTestCase
from gaiatest.apps.lockscreen.app import LockScreen


class TestLockScreen(PasscodeTestCase):

    _input_passcode = '1337'

    def setUp(self):
        GaiaTestCase.setUp(self)

        self.set_passcode_to_1337()

        self.data_layer.set_setting('lockscreen.passcode-lock.enabled', True)

        # this time we need it locked!
        self.device.lock()

    def test_unlock_to_homescreen_with_passcode(self):
        """
        https://moztrap.mozilla.org/manage/case/1296/
        """
        lock_screen = LockScreen(self.marionette)
        lock_screen.switch_to_frame()
        passcode_pad = lock_screen.unlock_to_passcode_pad()
        homescreen = passcode_pad.type_passcode(self._input_passcode)

        self.wait_for_condition(lambda m: self.apps.displayed_app.name == homescreen.name)
