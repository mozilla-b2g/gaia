# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest import GaiaTestCase
from gaiatest.apps.lockscreen.app import LockScreen


class TestLockScreenAccessibility(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.apps.set_permission('Camera', 'geolocation', 'deny')
        self.device.lock()

    def test_a11y_unlock_to_camera(self):
        lock_screen = LockScreen(self.marionette)
        camera = lock_screen.a11y_click_camera_button()
        lock_screen.wait_for_lockscreen_not_visible()
        self.assertEquals(self.apps.displayed_app.name, camera.name)

        windows = self.marionette.find_element(By.ID, 'windows')
        self.assertFalse(self.accessibility.is_hidden(windows))

        self.frame_manager.wait_for_and_switch_to_top_frame(camera.name.lower())
        camera.wait_for_capture_ready()
