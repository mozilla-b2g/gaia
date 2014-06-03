# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time

from gaiatest import GaiaTestCase
from gaiatest.apps.messages.app import Messages
from gaiatest.mocks.mock_contact import MockContact
from gaiatest.apps.contacts.regions.contact_form import NewContact
from gaiatest.apps.contacts.app import Contacts


class TestSmsCreateContact(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

        _text_message_content = "Automated Test %s" % str(time.time())

        self.data_layer.send_sms(self.testvars['carrier']['phone_number'], _text_message_content)
        self.messages = Messages(self.marionette)
        self.messages.launch()

    def test_sms_create_new_contact(self):
        self.contact = MockContact()
        self.message_thread = self.messages.tap_first_received_message()
        self.message_thread.wait_for_received_messages()

        # Check that we received the correct message
        self.assertEqual(self.message_thread.header_text, self.testvars['carrier']['phone_number'])

        activities = self.message_thread.tap_header()

        # Create a new contact
        activities.tap_create_new_contact()

        # Populate new contact fields
        new_contact = NewContact(self.marionette)
        new_contact.type_given_name(self.contact['givenName'])
        new_contact.type_family_name(self.contact['familyName'])
        new_contact.type_email(self.contact['email']['value'])
        new_contact.type_street(self.contact['adr']['streetAddress'])
        new_contact.type_zip_code(self.contact['adr']['postalCode'])
        new_contact.type_city(self.contact['adr']['locality'])
        new_contact.type_country(self.contact['adr']['countryName'])
        new_contact.type_comment(self.contact['note'])
        new_contact.tap_done(return_contacts=False)

        self.messages.switch_to_messages_frame()
        self.wait_for_condition(lambda m: self.message_thread.header_text == self.contact['name'])

        contacts = Contacts(self.marionette)
        contacts.launch()
        contact_details = contacts.contacts[0].tap()
        self.assertEqual(contact_details.phone_numbers[0], self.testvars['carrier']['phone_number'])
