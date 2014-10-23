# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.lockscreen.app import LockScreen


class TestLockScreen(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

        # Turn off geolocation prompt
        self.apps.set_permission('Camera', 'geolocation', 'deny')

        # this time we need it locked!
        self.device.lock()

    def test_unlock_to_camera(self):
        """
        https://moztrap.mozilla.org/manage/case/2460/
        """

        lock_screen = LockScreen(self.marionette)
        lock_screen.switch_to_frame()
        camera = lock_screen.unlock_to_camera()
        self.wait_for_condition(lambda m: self.apps.displayed_app.name == camera.name)

        self.assertFalse(self.device.is_locked)

        # Wait fot the capture button displayed. no need to take a photo.
        self.apps.switch_to_displayed_app()
        camera.wait_for_capture_ready()
