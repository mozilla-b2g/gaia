# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.mocks.mock_contact import MockContact

from gaiatest.apps.contacts.app import Contacts


class TestContacts(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

        self.contact = MockContact()
        self.data_layer.insert_contact(self.contact)

    def test_sms_contact(self):
        # https://moztrap.mozilla.org/manage/case/1314/
        # Setup a text message from a contact.

        contacts = Contacts(self.marionette)
        contacts.launch()
        contacts.wait_for_contacts()

        # Tap on the created contact.
        contact_details = contacts.contact(self.contact['givenName'][0]).tap()
        new_message = contact_details.tap_send_sms()
        new_message.wait_for_recipients_displayed()

        expected_name = self.contact['givenName'][0] + " " + self.contact['familyName'][0]
        expected_tel = self.contact['tel'][0]['value']

        # Now check the first listed is from contacts app.
        # Name and phone number have been passed in correctly.
        self.assertEqual(new_message.first_recipient_name, expected_name)
        self.assertEqual(new_message.first_recipient_number_attribute, expected_tel)
