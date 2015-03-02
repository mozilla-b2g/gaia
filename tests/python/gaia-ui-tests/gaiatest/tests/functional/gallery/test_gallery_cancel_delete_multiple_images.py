# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.gallery.app import Gallery
from marionette_driver import Wait


class TestGalleryMultiDelete(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

        # add multiple photos to storage
        self.push_resource('image_formats/01.jpg')
        self.push_resource('image_formats/02.png')
        self.push_resource('image_formats/03.gif')

    def test_gallery_delete_image(self):
        """
        https://moztrap.mozilla.org/manage/case/1534/
        """

        gallery = Gallery(self.marionette)
        gallery.launch()
        gallery.wait_for_files_to_load(3)

        # Select 3 images
        gallery_multi_view = gallery.switch_to_multiple_selection_view()
        gallery_multi_view.select_nth_picture(0)
        gallery_multi_view.select_nth_picture(1)
        gallery_multi_view.select_nth_picture(2)

        # Tap the delete button and press cancel button
        gallery_multi_view.tap_delete_button(confirm=False)

        # Verify files still exist and still selected
        self.assertEqual(3, gallery_multi_view.number_of_selected_images)
        self.assertEqual(3, gallery.gallery_items_number)
