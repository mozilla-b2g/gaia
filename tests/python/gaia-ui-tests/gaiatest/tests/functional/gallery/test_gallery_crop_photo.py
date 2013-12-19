# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest import GaiaTestCase
from gaiatest.apps.gallery.app import Gallery


class TestGalleryCropPhoto(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

        # add photo to storage
        self.push_resource('IMG_0001.jpg', destination='DCIM/100MZLLA')

    def test_gallery_crop_photo(self):
        gallery = Gallery(self.marionette)
        gallery.launch()
        gallery.wait_for_files_to_load(1)

        image = gallery.tap_first_gallery_item()
        initial_scale = image.current_scale

        # Tap on Edit button.
        edit_image = image.tap_edit_button()
        edit_image.tap_edit_crop_button()
        edit_image.tap_portrait_crop()

        gallery = edit_image.tap_edit_save_button()

        gallery.wait_for_files_to_load(2)

        # Verify new Photo is created
        self.assertEqual(2, gallery.gallery_items_number)

        image1 = gallery.tap_first_gallery_item()

        # The logic is: scale is inversely proportional with the size(witdh*height) of the image
        # if initial_scale < image1.current_scale then image > image1
        self.assertLess(initial_scale, image1.current_scale)
