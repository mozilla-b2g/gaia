# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import Wait

from gaiatest.gaia_graphics_test import GaiaImageCompareTestCase
from gaiatest import PasscodeTestCase
from gaiatest.apps.lockscreen.app import LockScreen


class TestLockScreen(GaiaImageCompareTestCase, PasscodeTestCase):

    _input_passcode = '1337'
    _seconds_since_epoch = 1357043430

    def setUp(self):
        GaiaImageCompareTestCase.setUp(self)

    def test_lockscreen_unlock_to_homescreen_with_passcode(self):
        # Need to wait until the carrier is detected, so the lockscreen will display the carrier information
        Wait(self.marionette, timeout = 30).until(lambda m: self.device.has_mobile_connection)

        self.data_layer.set_time(self._seconds_since_epoch * 1000)
        self.data_layer.set_setting('time.timezone', 'Atlantic/Reykjavik')

        self.set_passcode_to_1337()

        self.data_layer.set_setting('lockscreen.passcode-lock.enabled', True)

        # this time we need it locked!
        self.device.lock()

        # 1st try
        lock_screen = LockScreen(self.marionette)
        lock_screen.switch_to_frame()
        lock_screen.unlock_to_passcode_pad()
        self.take_screenshot()
        self.device.turn_screen_off()

        # 2nd try
        self.device.turn_screen_on()
        lock_screen.switch_to_frame()
        homescreen = lock_screen.unlock_to_homescreen_using_passcode(self._input_passcode)

        Wait(self.marionette).until(lambda m: self.apps.displayed_app.name == homescreen.name)
        self.take_screenshot()
