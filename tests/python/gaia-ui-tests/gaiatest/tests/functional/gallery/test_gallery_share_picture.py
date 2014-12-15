# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.gallery.app import Gallery


class TestGallerySharePicture(GaiaTestCase):

    images = 'IMG_0001.jpg'
    image_count = 2

    def setUp(self):
        GaiaTestCase.setUp(self)

        # Add photos to storage.
        self.push_resource(self.images, count=self.image_count)

    def test_gallery_share_to_messages(self):
        """
        https://moztrap.mozilla.org/manage/case/4008/
        """

        gallery = Gallery(self.marionette)
        gallery.launch()

        gallery.wait_for_files_to_load(self.image_count)
        self.assertEqual(gallery.gallery_items_number, self.image_count)

        # Enter multiple selection mode and select a picture
        multiple_selection_view = gallery.switch_to_multiple_selection_view()
        multiple_selection_view.select_first_picture()

        # Share the picture to messages
        activities = multiple_selection_view.tap_share_button()
        new_message = activities.share_to_messages()

        # Assert that the new message has an attachment
        new_message.wait_for_message_input_displayed()
        self.assertTrue(new_message.has_attachment)
