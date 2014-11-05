# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

# Approximate runtime per 100 iterations: 85 minutes

from gaiatest import GaiaEnduranceTestCase
from gaiatest.apps.gallery.app import Gallery


class TestEnduranceGalleryFlick(GaiaEnduranceTestCase):

    images = 'IMG_0001.jpg'
    image_count = 10

    def setUp(self):
        GaiaEnduranceTestCase.setUp(self)

        # Add photos to storage.
        self.push_resource(self.images, count=self.image_count)

        # Start gallery app
        self.gallery = Gallery(self.marionette)
        self.gallery.launch()
        self.gallery.wait_for_files_to_load(self.image_count)
        self.assertTrue(self.gallery.gallery_items_number >= self.image_count)

        # Tap first image to open full screen view.
        self.image = self.gallery.tap_first_gallery_item()

    def test_endurance_gallery_flick(self):
        self.drive(test=self.gallery_flick, app='gallery')

    def gallery_flick(self):
        # Flick through images in gallery, and back again
        # Original code taken from existing webqa test (test_gallery_flick.py, thanks!)
        previous_image_source = None

        # Check the next flicks.
        for i in range(self.gallery.gallery_items_number):
            self.assertIsNotNone(self.image.current_image_source)
            self.assertNotEqual(self.image.current_image_source, previous_image_source)
            self.assertTrue(self.image.is_photo_toolbar_displayed)
            previous_image_source = self.image.current_image_source
            self.image.flick_to_next_image()

        self.assertIsNotNone(self.image.current_image_source)
        self.assertEqual(self.image.current_image_source, previous_image_source)
        self.assertTrue(self.image.is_photo_toolbar_displayed)

        # Check the prev flick.
        for i in range(self.gallery.gallery_items_number - 1):
            self.image.flick_to_previous_image()
            self.assertIsNotNone(self.image.current_image_source)
            self.assertNotEqual(self.image.current_image_source, previous_image_source)
            self.assertTrue(self.image.is_photo_toolbar_displayed)
            previous_image_source = self.image.current_image_source

        # Try to flick prev image (No image should be available)
        self.image.flick_to_previous_image()
        self.assertIsNotNone(self.image.current_image_source)
        self.assertEqual(self.image.current_image_source, previous_image_source)
        self.assertTrue(self.image.is_photo_toolbar_displayed)
