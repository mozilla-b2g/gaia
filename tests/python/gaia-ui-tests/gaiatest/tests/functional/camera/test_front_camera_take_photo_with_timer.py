# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.camera.app import Camera


class TestCamera(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

        # Turn off geolocation prompt
        self.apps.set_permission('Camera', 'geolocation', 'deny')

    def test_capture_a_photo(self):
        """https://moztrap.mozilla.org/manage/case/15800/"""
        self.previous_number_of_pictures = len(self.data_layer.picture_files)

        self.camera = Camera(self.marionette)
        self.camera.launch()

        # Open Camera Settings and turn on timer
        
        
        # Switch to Front Facing Camera
        
        
        # Take a photo
        self.camera.take_photo()

        # Check that Filmstrip is visible
        self.assertTrue(self.camera.is_thumbnail_visible)

        # Check that picture saved to SD card
        self.wait_for_condition(lambda m: len(self.data_layer.picture_files) == self.previous_number_of_pictures + 1, 10)
        self.assertEqual(len(self.data_layer.picture_files), self.previous_number_of_pictures + 1)
