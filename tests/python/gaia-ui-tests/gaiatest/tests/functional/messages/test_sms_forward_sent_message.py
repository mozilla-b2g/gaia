# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time
from gaiatest import GaiaTestCase
from gaiatest.apps.messages.app import Messages


class TestSmsForwardMessage(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)
        self._text_message_content = "Automated Test %s" % str(time.time())

        # We need to have at least one message sent in the message app
        self.data_layer.send_sms(self.testvars['plivo']['phone_number'], self._text_message_content)

    def test_sms_forward_sent_message(self):
        """
        https://moztrap.mozilla.org/manage/case/11075/
        """

        # Launch the app
        messages = Messages(self.marionette)
        messages.launch()
        message_thread = messages.tap_first_received_message()
        sent_messages = len(message_thread.sent_messages)

        # Forward the last sent message
        last_sent_message = message_thread.sent_messages[-1]
        activities = last_sent_message.long_press_message()
        new_message = activities.tap_forward_message()

        # Check that the 'To' field is empty
        self.assertEqual(new_message.recipients[0].text, u'')

        # Check that the message field has the content we expect
        self.assertEqual(new_message.message, self._text_message_content)

        new_message.type_phone_number(self.testvars['plivo']['phone_number'])
        new_message.tap_send()

        # Wait for the message to be sent correctly
        self.wait_for_condition(lambda m: len(message_thread.sent_messages) > sent_messages)

        # Check that the last sent message has the content we expect
        self.assertEqual(message_thread.sent_messages[1].text, self._text_message_content)
