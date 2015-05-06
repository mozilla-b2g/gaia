# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time

from gaiatest import GaiaTestCase
from gaiatest.apps.messages.app import Messages
from gaiatest.mocks.mock_contact import MockContact
from gaiatest.apps.contacts.app import Contacts


class TestSmsAddToExistingContact(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

        self.contact = MockContact()
        self.data_layer.insert_contact(self.contact)

        _text_message_content = "Automated Test %s" % str(time.time())

        self.data_layer.send_sms(self.environment.phone_numbers[0], _text_message_content)

        self.messages = Messages(self.marionette)
        self.messages.launch()

    def test_sms_add_number_to_existing_contact(self):

        # open the message thread screen
        self.message_thread = self.messages.tap_first_received_message()
        self.message_thread.wait_for_received_messages()

        # Check that we received the correct message
        self.assertEqual(self.message_thread.header_text, self.environment.phone_numbers[0])

        activities = self.message_thread.tap_header()

        contacts = activities.tap_add_to_contact()
        contacts.wait_for_contacts(1)
        edit_contact = contacts.contacts[0].tap(return_class='EditContact')

        edit_contact.tap_update(return_details=False)

        self.wait_for_condition(lambda m: self.message_thread.header_text == self.contact['name'])

        contacts = Contacts(self.marionette)
        contacts.launch()

        contact_details = contacts.contacts[0].tap()
        self.assertEqual(contact_details.phone_numbers[1], self.environment.phone_numbers[0])
