# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.gallery.app import Gallery


class TestGalleryDelete(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

        # add photo to storage
        self.push_resource('IMG_0001.jpg')

    def test_gallery_delete_image(self):
        gallery = Gallery(self.marionette)
        gallery.launch()
        gallery.wait_for_files_to_load(1)

        # Tap first image to open full screen view.
        image = gallery.tap_first_gallery_item()

        # Tap the delete button from the fullscreen toolbar.
        image.tap_delete_button()

        # Tap the confirm delete button.
        image.tap_confirm_deletion_button()
        self.wait_for_condition(lambda m: gallery.empty_gallery_text == 'Use the Camera app to get started.')

        # Verify empty gallery title.
        self.assertEqual(gallery.empty_gallery_title, 'No photos or videos')
