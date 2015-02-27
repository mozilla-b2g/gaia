# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time

from gaiatest import GaiaTestCase
from gaiatest.apps.messages.app import Messages


class TestSmsWithPictureAttached(GaiaTestCase):

    _text_message_content = 'Automated Test %s' % str(time.time())

    def setUp(self):
        GaiaTestCase.setUp(self)

        # connect to mobile data
        self.data_layer.connect_to_cell_data()

        # add photo to storage
        self.push_resource('IMG_0001.jpg')

    def test_sms_cropped_picture(self):
        """
        https://moztrap.mozilla.org/manage/case/10742/
        """
        # launch the app
        messages = Messages(self.marionette)
        messages.launch()

        # click new message
        new_message = messages.tap_create_new_message()

        # type phone number
        new_message.type_phone_number(self.environment.phone_numbers[0])

        # type text message
        new_message.type_message(self._text_message_content)

        # add attachment
        activities_list = new_message.tap_attachment()

        # select gallery
        gallery = activities_list.tap_gallery()

        # go through the crop process
        gallery.wait_for_thumbnails_to_load()
        gallery.thumbnails[0].tap()
        from gaiatest.apps.gallery.regions.crop_view import CropView
        crop_view = CropView(self.marionette)

        # can't actually crop the element
        crop_view.tap_crop_done()

        # back to messages app frame
        new_message.wait_for_resizing_to_finish()

        # Tap on attachment
        attachment_options = new_message.tap_image_attachment()
        view_image = attachment_options.tap_view_button()

        # Check that the attached image is displayed
        self.assertTrue(view_image.is_image_visible)
        view_image.tap_back_button()

        attachment_options.tap_cancel()

        # click send
        self.message_thread = new_message.tap_send(timeout=300)
        self.message_thread.wait_for_received_messages(timeout=300)

        # get the most recent listed and most recent received text message
        last_received_message = self.message_thread.received_messages[-1]
        last_message = self.message_thread.all_messages[-1]

        # Check the most recent received message has the same text content
        self.assertEqual(self._text_message_content, last_received_message.text.strip('\n').strip())

        # Check that most recent message is also the most recent received message
        self.assertEqual(last_received_message.id, last_message.id)

        # Check that message has attachments
        self.assertTrue(last_message.has_attachments)

        # Tap on the attachment
        view_image = last_message.tap_attachment()

        # Check that the attached image is displayed
        self.assertTrue(view_image.is_image_visible)
