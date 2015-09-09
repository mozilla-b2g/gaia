# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
import time
from gaiatest.apps.messages.app import Messages


class TestSms(GaiaTestCase):

    def test_sms_send(self):
        """This test sends a text message to itself. It waits for a reply message.

        https://moztrap.mozilla.org/manage/case/1322/
        https://moztrap.mozilla.org/manage/case/1293/
        """
        _text_message_content = "Automated Test %s" % str(time.time())

        self.messages = Messages(self.marionette)
        self.messages.launch()

        new_message = self.messages.create_new_message(recipients=[self.environment.phone_numbers[0]],
                                                       message=_text_message_content)
        self.message_thread = new_message.tap_send()
        self.message_thread.wait_for_received_messages()

        last_received_message = self.message_thread.received_messages[-1]
        last_message = self.message_thread.all_messages[-1]

        self.assertEqual(_text_message_content, last_received_message.text)
        self.assertEqual(last_received_message.id, last_message.id)
