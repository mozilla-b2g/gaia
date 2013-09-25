# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.gallery.app import Gallery


class TestGallery(GaiaTestCase):

    images = 'IMG_0001.jpg'
    image_count = 4

    def setUp(self):
        GaiaTestCase.setUp(self)

        # Add photos to storage.
        self.push_resource(self.images, self.image_count, 'DCIM/100MZLLA')

    def test_gallery_full_screen_image_flicks(self):
        # https://moztrap.mozilla.org/manage/case/1326/

        gallery = Gallery(self.marionette)
        gallery.launch()
        gallery.wait_for_files_to_load(self.image_count)

        self.assertEqual(gallery.gallery_items_number, self.image_count)

        # Tap first image to open full screen view.
        image = gallery.tap_first_gallery_item()

        previous_image_source = None

        # Check the next flicks.
        for i in range(gallery.gallery_items_number):
            self.assertIsNotNone(image.current_image_source)
            self.assertNotEqual(image.current_image_source, previous_image_source)
            self.assertTrue(image.is_photo_toolbar_displayed)
            previous_image_source = image.current_image_source
            image.flick_to_next_image()

        self.assertIsNotNone(image.current_image_source)
        self.assertEqual(image.current_image_source, previous_image_source)
        self.assertTrue(image.is_photo_toolbar_displayed)

        # Check the prev flick.
        for i in range(gallery.gallery_items_number - 1):
            image.flick_to_previous_image()
            self.assertIsNotNone(image.current_image_source)
            self.assertNotEqual(image.current_image_source, previous_image_source)
            self.assertTrue(image.is_photo_toolbar_displayed)
            previous_image_source = image.current_image_source

        # Try to flick prev image (No image should be available)
        image.flick_to_previous_image()
        self.assertIsNotNone(image.current_image_source)
        self.assertEqual(image.current_image_source, previous_image_source)
        self.assertTrue(image.is_photo_toolbar_displayed)
