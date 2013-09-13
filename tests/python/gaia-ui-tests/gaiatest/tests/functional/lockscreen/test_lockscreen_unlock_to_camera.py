# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest import GaiaTestCase
from gaiatest.apps.lockscreen.app import LockScreen


class TestLockScreen(GaiaTestCase):
    _camera_frame_locator = (By.CSS_SELECTOR, 'iframe[src^="app://camera"][src$="index.html"]')

    def setUp(self):
        GaiaTestCase.setUp(self)

        # Turn off geolocation prompt
        self.apps.set_permission('Camera', 'geolocation', 'deny')

        # this time we need it locked!
        self.lockscreen.lock()

        self.lock_screen = LockScreen(self.marionette)
        self.lock_screen.wait_for_lockscreen_handle_visible()

    def test_unlock_swipe_to_camera(self):
        # https://moztrap.mozilla.org/manage/case/2460/

        self.lock_screen.swipe_to_unlock()
        camera = self.lock_screen.tap_camera_button()

        # Wait fot the capture button displayed. no need to take a photo.
        camera.wait_for_camera_ready()
