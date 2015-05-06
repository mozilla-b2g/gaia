# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time

from marionette_driver import Wait

from gaiatest import GaiaTestCase
from gaiatest.apps.contacts.app import Contacts
from gaiatest.mocks.mock_contact import MockContact


class TestContacts(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.contact = MockContact(tel={
            'value': self.environment.phone_numbers[0]})
        self.data_layer.insert_contact(self.contact)

    def test_sms_contact(self):
        """
        https://moztrap.mozilla.org/manage/case/1314/
        """
        # Setup a text message from a contact.

        text_message_content = "Automated Test %s" % str(time.time())

        contacts = Contacts(self.marionette)
        contacts.launch()
        contacts.wait_for_contacts()

        # Tap on the created contact.
        contact_details = contacts.contact(self.contact['givenName']).tap()
        new_message = contact_details.tap_send_sms()
        new_message.wait_for_recipients_displayed()

        expected_name = self.contact['givenName'] + " " + self.contact['familyName']
        expected_tel = self.contact['tel']['value']

        # Now check the first listed is from contacts app.
        # Name and phone number have been passed in correctly.
        self.assertEqual(new_message.first_recipient_name, expected_name)
        self.assertEqual(new_message.first_recipient_number_attribute, expected_tel)

        self.marionette.switch_to_frame()
        Wait(self.marionette).until(lambda m: new_message.keyboard.is_keyboard_displayed)
        self.apps.switch_to_displayed_app()

        new_message.type_message(text_message_content)
        message_thread = new_message.tap_send()

        message_thread.wait_for_received_messages()

        # Get the most recent received text message
        last_received_message = message_thread.received_messages[-1]

        # Check the most recent received message has the same text content
        self.assertEqual(text_message_content, last_received_message.text)
