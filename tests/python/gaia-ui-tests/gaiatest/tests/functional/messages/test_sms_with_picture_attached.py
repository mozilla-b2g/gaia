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
        self.data_layer.connect_to_cell_data()
        self.push_resource('IMG_0001.jpg')

    def test_sms_cropped_picture(self):
        """
        https://moztrap.mozilla.org/manage/case/10742/
        """

        messages = Messages(self.marionette)
        messages.launch()

        new_message = messages.create_new_message(recipients=[self.environment.phone_numbers[0]],
                                                  message=self._text_message_content)

        activities_list = new_message.tap_attachment()
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

        attachment_options = new_message.tap_image_attachment()
        view_image = attachment_options.tap_view_button()

        self.assertTrue(view_image.is_image_visible)
        view_image.go_back_that_exits_from_app()

        self.message_thread = new_message.tap_send(timeout=300)
        self.message_thread.wait_for_received_messages(timeout=300)

        last_received_message = self.message_thread.received_messages[-1]
        last_message = self.message_thread.all_messages[-1]


        self.assertEqual(self._text_message_content, last_received_message.text.strip('\n').strip())
        self.assertEqual(last_received_message.id, last_message.id)
        self.assertTrue(last_message.has_attachments)


        view_image = last_message.tap_attachment()
        self.assertTrue(view_image.is_image_visible)

    def tearDown(self):
        self.marionette.switch_to_frame()
        self.data_layer.disable_cell_data()
        GaiaTestCase.tearDown(self)
