# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time

from gaiatest import GaiaTestCase
from gaiatest.apps.messages.app import Messages


class TestSmsWithAttachments(GaiaTestCase):

    _text_message_content = 'Automated Test %s' % str(time.time())

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.data_layer.connect_to_cell_data()

    def test_sms_send(self):
        """
        https://moztrap.mozilla.org/manage/case/10743/
        """
        messages = Messages(self.marionette)
        messages.launch()

        new_message = messages.create_new_message(recipients=[self.environment.phone_numbers[0]],
                                                  message=self._text_message_content)
        activities_list = new_message.tap_attachment()
        camera = activities_list.tap_camera()

        camera.tap_capture()
        camera.tap_select_button()

        # back to messages app frame
        new_message.wait_for_resizing_to_finish()

        self.message_thread = new_message.tap_send(timeout=300)
        self.message_thread.wait_for_received_messages(timeout=300)

        last_received_message = self.message_thread.received_messages[-1]
        last_message = self.message_thread.all_messages[-1]

        self.assertEqual(self._text_message_content, last_received_message.text.strip('\n').strip())
        self.assertEqual(last_received_message.id, last_message.id)
        self.assertTrue(last_message.has_attachments)

        view_image = last_message.tap_attachment()
        view_image.tap_save_image()
        self.assertIn('saved to Gallery', view_image.banner_message)

        # 2 pictures should be on the sd card:
        # One is the picture we sent, the other is the one saved
        self.assertEqual(2, len(self.data_layer.picture_files))

    def tearDown(self):
        self.marionette.switch_to_frame()
        self.data_layer.disable_cell_data()
        GaiaTestCase.tearDown(self)
