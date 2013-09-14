# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.gallery.app import Gallery


class TestGalleryTilesView(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

        # add photo to storage
        self.push_resource('IMG_0001.jpg', destination='DCIM/100MZLLA')

    def test_gallery_view(self):
        """ Test return to tiles view
        Load gallery.
        Tap the image and wait for it to load.
        Tap the tile view toolbar icon.
        Assert that the app returns to the main/tile view screen.
        """

        gallery = Gallery(self.marionette)
        gallery.launch()
        gallery.wait_for_files_to_load(1)

        image = gallery.tap_first_gallery_item()
        self.assertTrue(image.is_photo_toolbar_displayed)

        gallery = image.tap_tile_view_button()
        self.assertTrue(gallery.are_gallery_items_displayed)
