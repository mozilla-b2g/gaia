# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import Wait

from gaiatest import GaiaTestCase
from gaiatest.apps.gallery.app import Gallery
from gaiatest.apps.camera.app import ImagePreview


class TestGallery(GaiaTestCase):
    def setUp(self):
        GaiaTestCase.setUp(self)

        self.apps.set_permission('Camera', 'geolocation', 'deny')

        self.push_resource('IMG_0001.jpg')

    def test_gallery_switch_to_camera(self):
        """
        https://moztrap.mozilla.org/manage/case/3620/
        """

        gallery = Gallery(self.marionette)
        gallery.launch()
        gallery.wait_for_files_to_load(1)

        # Enter the single photo view
        image = gallery.tap_first_gallery_item()
        self.assertIsNotNone(image.current_image_source)

        # Check that there are 5 options displayed beneath the picture
        self.assertEqual(len(image.photo_toolbar_options), 5)

        # Tap on the Camera button to go to the Camera app
        self.previous_number_of_pictures = len(self.data_layer.picture_files)
        self.camera = image.tap_switch_to_camera()

        # Take a picture and verify the picture is taken
        self.camera.take_photo()

        # Check that picture saved to SD card
        Wait(self.marionette).until(lambda m: len(self.data_layer.picture_files) ==
                                    self.previous_number_of_pictures + 1)

        # Open Preview, tap the option icon and select Gallery app
        self.camera.tap_thumbnail()
        self.preview = ImagePreview(self.marionette)
        self.preview.tap_switch_to_gallery()

        # Verify the Gallery app is now open, with one more file
        gallery.wait_for_files_to_load(2)
        new_image = gallery.tap_first_gallery_item()
        # verify the new first image is not same as the previous (and only) first image,
        # meaning that the new image is shown on the top of the gallery app grid
        self.assertFalse(new_image.current_image_source is image.current_image_source)
