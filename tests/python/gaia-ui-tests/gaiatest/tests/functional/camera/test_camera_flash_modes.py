# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.camera.app import Camera


class TestCameraFlashModes(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

        # Turn off Geolocation prompt
        self.apps.set_permission('Camera', 'geolocation', 'deny')

    def test_camera_flash_modes(self):
        # https://moztrap.mozilla.org/manage/case/1325/
        self.camera = Camera(self.marionette)
        self.camera.launch()

        # Toggle flash mode to "on"
        self.camera.tap_toggle_flash_button()
        self.assertEqual(self.camera.current_flash_mode, 'on')

        # Take a photo
        self.camera.take_photo()

        # Check that Filmstrip is visible
        self.assertTrue(self.camera.is_filmstrip_visible)

        # Check that picture saved to SD card
        self.wait_for_condition(lambda m: len(self.data_layer.picture_files) == 1)
        self.assertEqual(len(self.data_layer.picture_files), 1)

        # Toggle flash mode to "off"
        self.camera.tap_toggle_flash_button()
        self.assertEqual(self.camera.current_flash_mode, 'off')

        # Take a photo
        self.camera.take_photo()

        # Check that Filmstrip is visible
        self.assertTrue(self.camera.is_filmstrip_visible)

        # Check that picture saved to SD card
        self.wait_for_condition(lambda m: len(self.data_layer.picture_files) == 2)
        self.assertEqual(len(self.data_layer.picture_files), 2)

        # Toggle flash mode to "auto"
        self.camera.tap_toggle_flash_button()
        self.assertEqual(self.camera.current_flash_mode, 'auto')

        # Take a photo
        self.camera.take_photo()

        # Check that Filmstrip is visible
        self.assertTrue(self.camera.is_filmstrip_visible)

        # Check that picture saved to SD card
        self.wait_for_condition(lambda m: len(self.data_layer.picture_files) == 3)
        self.assertEqual(len(self.data_layer.picture_files), 3)
