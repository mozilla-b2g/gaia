# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
from marionette_driver import By
from gaiatest import GaiaTestCase
from gaiatest.apps.gallery.app import Gallery


class TestGalleryCropPhoto(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

        # add photo to storage
        self.push_resource('IMG_0001.jpg')

    def test_gallery_crop_photo(self):
        gallery = Gallery(self.marionette)
        gallery.launch()
        gallery.wait_for_files_to_load(1)

        initial_image_size = gallery.thumbnails[0].absolute_image_size
        image = gallery.tap_first_gallery_item()

        # Tap on Edit button.
        edit_image = image.tap_edit_button()
        edit_image.tap_edit_crop_button()
        # portrait crop is 2:3 and will retain the image's height
        edit_image.tap_portrait_crop()
        edit_image.tap_edit_tool_apply_button()

        gallery = edit_image.tap_edit_save_button()
        gallery.wait_for_files_to_load(2)

        # get the absolute image for the new first image
        cropped_image_size = gallery.thumbnails[0].absolute_image_size

        # As we have chosen portrait crop, height will remain the same, width should change
        self.assertEqual(cropped_image_size['height'], initial_image_size['height'])
        self.assertLess(cropped_image_size['width'], initial_image_size['width'])
