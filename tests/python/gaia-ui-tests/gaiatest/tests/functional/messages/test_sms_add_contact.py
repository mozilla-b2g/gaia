# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time

from gaiatest import GaiaTestCase
from gaiatest.apps.messages.app import Messages
from gaiatest.mocks.mock_contact import MockContact


class TestSmsAddContact(GaiaTestCase):

    def test_sms_add_contact(self):
        """ Add a contact to a message. """

        _text_message_content = "Automated Test %s" % str(time.time())

        # insert contact
        self.contact = MockContact(tel=[{
            'type': ['Mobile'],
            'value': "%s" % self.testvars['carrier']['phone_number']}])
        self.data_layer.insert_contact(self.contact)

        self.messages = Messages(self.marionette)
        self.messages.launch()

        new_message = self.messages.tap_create_new_message()
        contacts_app = new_message.tap_add_recipient()
        contacts_app.wait_for_contacts()
        contacts_app.contact(self.contact['givenName'][0]).tap(return_details=False)
        self.messages.switch_to_messages_frame()

        self.assertIn(self.contact['givenName'][0], new_message.first_recipient_name)

        new_message.type_message(_text_message_content)

        self.message_thread = new_message.tap_send()
        self.message_thread.wait_for_received_messages()

        last_received_message = self.message_thread.received_messages[-1]
        self.assertEqual(_text_message_content, last_received_message.text)
