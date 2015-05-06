# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import Wait

from gaiatest.apps.lockscreen.app import LockScreen
from gaiatest.gaia_graphics_test import GaiaImageCompareTestCase


class TestLockScreenAccessibility(GaiaImageCompareTestCase):

    def setUp(self):
        GaiaImageCompareTestCase.setUp(self)
        self.device.lock()

    def test_unlock_to_homescreen(self):

        lock_screen = LockScreen(self.marionette)
        lock_screen.switch_to_frame()
        homescreen = lock_screen.unlock()

        Wait(self.marionette).until(lambda m: self.apps.displayed_app.name == homescreen.name)
        self.take_screenshot()
