# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest import GaiaTestCase
from gaiatest.apps.lockscreen.app import LockScreen


class TestLockScreen(GaiaTestCase):

    # Homescreen locators
    _homescreen_frame_locator = (By.CSS_SELECTOR, 'div.homescreen iframe')
    _homescreen_landing_locator = (By.ID, 'landing-page')

    def setUp(self):
        GaiaTestCase.setUp(self)

        # this time we need it locked!
        self.lockscreen.lock()
        self.lock_screen = LockScreen(self.marionette)
        self.lock_screen.wait_for_lockscreen_handle_visible()

    def test_unlock_swipe_to_homescreen(self):
        # https://moztrap.mozilla.org/manage/case/1296/
        self.lock_screen.swipe_to_unlock()
        self.lock_screen.tap_unlock_button()

        self.lock_screen.wait_for_lockscreen_not_visible()

        hs_frame = self.marionette.find_element(*self._homescreen_frame_locator)
        # TODO I would prefer to check visibility of the the frame at this point but bug 813583
        self.marionette.switch_to_frame(hs_frame)

        # Instead, check the main element of the landing screen
        landing_element = self.marionette.find_element(*self._homescreen_landing_locator)

        self.assertTrue(landing_element.is_displayed(), "Landing element not displayed after unlocking")
