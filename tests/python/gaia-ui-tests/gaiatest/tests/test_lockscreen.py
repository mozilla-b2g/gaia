# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase


class TestLockScreen(GaiaTestCase):

    # Lockscreen area locators
    _lockscreen_locator = ('id', 'lockscreen')
    _lockscreen_area_locator = ('id', 'lockscreen-area')
    _lockscreen_handle_locator = ('id', 'lockscreen-area-handle')
    _unlock_button_locator = ('id', 'lockscreen-area-unlock')
    _camera_button_locator = ('id', 'lockscreen-area-camera')

    # Homescreen locators
    _homescreen_frame_locator = ('css selector', 'div.homescreen iframe')
    _homescreen_landing_locator = ('id', 'landing-page')

    # Camera locators
    _camera_frame_locator = ('css selector', 'iframe[src="app://camera.gaiamobile.org/index.html"]')
    _capture_button_locator = ('id', 'capture-button')

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
        self.wait_for_condition(lambda m: not lockscreen_element.is_displayed())

        self.assertFalse(lockscreen_element.is_displayed(), "Lockscreen still visible after unlock")

        hs_frame = self.marionette.find_element(*self._homescreen_frame_locator)
        # TODO I would prefer to check visibility of the the frame at this point but bug 813583
        self.marionette.switch_to_frame(hs_frame)

        # Instead, check the main element of the landing screen
        landing_element = self.marionette.find_element(*self._homescreen_landing_locator)

        self.assertTrue(landing_element.is_displayed(), "Landing element not displayed after unlocking")

    def test_unlock_swipe_to_camera(self):
        # https://moztrap.mozilla.org/manage/case/2460/
        self._swipe_and_unlock()

        camera_button = self.marionette.find_element(*self._camera_button_locator)
        camera_button.click()

        lockscreen_element = self.marionette.find_element(*self._lockscreen_locator)
        self.wait_for_condition(lambda m: not lockscreen_element.is_displayed())

        self.assertFalse(lockscreen_element.is_displayed(), "Lockscreen still visible after unlock")

        camera_frame = self.marionette.find_element(*self._camera_frame_locator)

        # TODO I would prefer to check visibility of the the frame at this point but bug 813583
        self.marionette.switch_to_frame(camera_frame)

        # Wait fot the capture button displayed. no need to take a photo.
        self.wait_for_element_displayed(*self._capture_button_locator)

    def _swipe_and_unlock(self):

        unlock_handle = self.marionette.find_element(*self._lockscreen_handle_locator)
        unlock_handle_x_centre = int(unlock_handle.size['width'] / 2)
        unlock_handle_y_centre = int(unlock_handle.size['height'] / 2)

        # Get the end position from the demo animation
        lockscreen_area = self.marionette.find_element(*self._lockscreen_area_locator)
        end_animation_position = lockscreen_area.size['height'] - unlock_handle.size['height']

        # Flick from unlock handle to (0, -end_animation_position) over 800ms duration
        self.marionette.flick(unlock_handle, unlock_handle_x_centre, unlock_handle_y_centre, 0, 0 - end_animation_position, 800)

        # Wait for the svg to animate and handle to disappear
        # TODO add assertion that unlock buttons are visible after bug 813561 is fixed
        self.wait_for_condition(lambda m: not unlock_handle.is_displayed())
