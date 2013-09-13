# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.gallery.app import Gallery


class TestGalleryShareMenu(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.push_resource('IMG_0001.jpg', destination='DCIM/100MZLLA')

    def test_gallery_click_share_button(self):
        gallery = Gallery(self.marionette)
        gallery.launch()

        gallery.wait_for_thumbnails_to_load()
        image = gallery.tap_first_gallery_item()

        self.assertIsNotNone(image.current_image_source)
        self.assertTrue(image.is_photo_toolbar_displayed)

        # click on share button and check the element is correct
        activities_list = image.tap_share_button()
        self.assertGreater(activities_list.options_count, 1)
        activities_list.tap_cancel()

        gallery = image.tap_tile_view_button()
        gallery.wait_for_thumbnails_to_load()

        image = gallery.tap_first_gallery_item()
        self.assertTrue(image.is_image_displayed)
