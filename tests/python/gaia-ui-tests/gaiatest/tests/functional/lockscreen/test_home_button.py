# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.lockscreen.app import LockScreen
from marionette_driver import Wait


class TestHomeButton(GaiaTestCase):

    def test_home_button_has_no_effect_on_lockscreen(self):
        lock_screen = LockScreen(self.marionette)

        self.device.lock()
        Wait(self.marionette).until(lambda m: lock_screen.is_visible)

        self.device.touch_home_button()
        self.assertTrue(lock_screen.is_visible)
