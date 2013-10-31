# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.mocks.mock_contact import MockContact
from gaiatest.apps.phone.app import Phone


class TestDialerAddContact(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.contact = MockContact()

        # launch the Phone app
        self.phone = Phone(self.marionette)
        self.phone.launch()

    def test_dialer_add_contact(self):

        number_to_verify = self.contact['tel'][0]['value']

        # Dial number
        self.phone.keypad.dial_phone_number(number_to_verify)

        # Assert that the number was entered correctly.
        self.assertEqual(self.phone.keypad.phone_number, number_to_verify)

        # Click Add contact button
        add_new_number = self.phone.keypad.tap_add_contact()

        # Tap on "Create New Contact"
        new_contact = add_new_number.tap_create_new_contact()

        # Enter data into fields
        new_contact.type_given_name(self.contact['givenName'][0])
        new_contact.type_family_name(self.contact['familyName'][0])

        # Click Done button
        new_contact.tap_done()

        # Switch back to keypad-view
        self.phone.launch()

        #Go to Contact list and Verify result
        contacts = self.phone.tap_contacts()

        # Check only one contact is created
        self.assertEqual(1, len(contacts.contacts))

        #  Tap on the new contact
        contact_details = contacts.contacts[0].tap()

        # Verify full name
        full_name = self.contact['givenName'][0] + " " + self.contact['familyName'][0]
        self.assertEqual(contact_details.full_name, full_name)

        # Verify phone number
        self.assertEqual(contact_details.phone_number, number_to_verify)
