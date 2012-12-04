# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase


class TestLockScreen(GaiaTestCase):

    # Lockscreen area locators
    _lockscreen_locator = ('id', 'lockscreen')
    _lockscreen_handle_locator = ('id', 'lockscreen-area-handle')
    _unlock_button_locator = ('id', 'lockscreen-area-unlock')

    # Homescreen locators
    _homescreen_frame_locator = ('css selector', 'iframe.homescreen')
    _homescreen_landing_locator = ('id', 'landing-page')

    def setUp(self):
        GaiaTestCase.setUp(self)

        # this time we need it locked!
        self.lockscreen.lock()

    def test_unlock_swipe_to_homescreen(self):
        # https://moztrap.mozilla.org/manage/case/1296/

        self._swipe_and_unlock()

        unlock_button = self.marionette.find_element(*self._unlock_button_locator)
        unlock_button.click()

        lockscreen_element = self.marionette.find_element(*self._lockscreen_locator)
        self.assertFalse(lockscreen_element.is_displayed(), "Lockscreen still visible after unlock")

        hs_frame = self.marionette.find_element(*self._homescreen_frame_locator)
        # TODO I would prefer to check visibility of the the frame at this point but bug 813583
        self.marionette.switch_to_frame(hs_frame)

        # Instead, check the main element of the landing screen
        landing_element = self.marionette.find_element(*self._homescreen_landing_locator)

        self.assertTrue(landing_element.is_displayed(), "Landing element not displayed after unlocking")

    def _swipe_and_unlock(self):

        unlock_handle = self.marionette.find_element(*self._lockscreen_handle_locator)
        unlock_handle_x_centre = int(unlock_handle.size['width']/2)
        unlock_handle_y_centre = int(unlock_handle.size['height']/2)

        # Flick from unlock handle to (0, -100) over 800ms duration
        self.marionette.flick(unlock_handle, unlock_handle_x_centre,
            unlock_handle_y_centre, 0, -100, 800)

        # Wait for the svg to animate and handle to disappear
        # TODO add assertion that unlock buttons are visible after bug 813561 is fixed
        self.wait_for_condition(lambda m: not unlock_handle.is_displayed())
