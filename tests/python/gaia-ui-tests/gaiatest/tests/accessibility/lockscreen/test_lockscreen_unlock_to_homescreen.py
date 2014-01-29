# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest import GaiaTestCase
from gaiatest.apps.lockscreen.app import LockScreen
from gaiatest.apps.homescreen.app import Homescreen


class TestLockScreenAccessibility(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.device.lock()

    def test_unlock_to_homescreen(self):
        lock_screen = LockScreen(self.marionette)
        homescreen = lock_screen.a11y_click_unlock_button()
        lock_screen.wait_for_lockscreen_not_visible()
        self.assertEquals(self.apps.displayed_app.name, homescreen.name)

        windows = self.marionette.find_element(By.ID, 'windows')
        self.assertFalse(self.accessibility.is_hidden(windows))
