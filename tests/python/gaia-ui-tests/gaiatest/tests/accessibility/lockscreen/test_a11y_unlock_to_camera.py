# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import By

from gaiatest import GaiaTestCase
from gaiatest.apps.lockscreen.app import LockScreen


class TestLockScreenAccessibility(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.apps.set_permission('Camera', 'geolocation', 'deny')
        self.device.lock()

    def test_a11y_unlock_to_camera(self):
        lock_screen = LockScreen(self.marionette)
        lockScreen_window = self.marionette.find_element(*lock_screen._lockscreen_window_locator)
        camera_locator = (By.CSS_SELECTOR, '[data-manifest-name="Camera"]')

        self.assertTrue(self.accessibility.is_visible(lockScreen_window))
        self.assertFalse(self.is_element_present(*camera_locator))

        camera = lock_screen.a11y_click_camera_button()
        self.wait_for_condition(lambda m: self.apps.displayed_app.name == camera.name)

        self.assertTrue(self.accessibility.is_hidden(lockScreen_window))
        self.assertTrue(self.accessibility.is_visible(self.marionette.find_element(
            *camera_locator)))

        self.apps.switch_to_displayed_app()
        camera.wait_for_capture_ready()
