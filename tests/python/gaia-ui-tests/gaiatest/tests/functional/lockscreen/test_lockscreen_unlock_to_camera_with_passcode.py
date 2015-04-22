# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import PasscodeTestCase
from gaiatest.apps.lockscreen.app import LockScreen


class TestCameraUnlockWithPasscode(PasscodeTestCase):
    def setUp(self):
        GaiaTestCase.setUp(self)

        # Turn off geolocation prompt
        self.apps.set_permission('Camera', 'geolocation', 'deny')

        self.setPasscodeTo1337()

        self.data_layer.set_setting('lockscreen.passcode-lock.enabled', True)

        # this time we need it locked!
        self.device.lock()

    def test_unlock_to_camera_with_passcode(self):
        """
        https://moztrap.mozilla.org/manage/case/2460/
        """

        lock_screen = LockScreen(self.marionette)
        lock_screen.switch_to_frame()
        camera = lock_screen.unlock_to_camera()

        self.assertTrue(self.device.is_locked)

        camera.switch_to_secure_camera_frame()
        camera.take_photo()

        # Check that thumbnail is visible
        self.assertTrue(camera.is_thumbnail_visible)

        # Check that picture saved to SD cards
        self.wait_for_condition(lambda m: len(self.data_layer.picture_files) == 1)
        self.assertEqual(len(self.data_layer.picture_files), 1)

        self.assertFalse(camera.is_gallery_button_visible)
