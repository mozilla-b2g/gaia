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

        # Dial number
        self.phone.keypad.dial_phone_number(self.contact['tel']['value'])

        # Assert that the number was entered correctly.
        self.assertEqual(self.phone.keypad.phone_number, self.contact['tel']['value'])

        # Click Add contact button
        add_new_number = self.phone.keypad.tap_add_contact()

        # Tap on "Create New Contact"
        new_contact = add_new_number.tap_create_new_contact()

        # Enter data into fields
        new_contact.type_given_name(self.contact['givenName'])
        new_contact.type_family_name(self.contact['familyName'])

        # Click Done button
        new_contact.tap_done()

        # Switch back to keypad-view
        self.wait_for_condition(lambda m: self.apps.displayed_app.name == self.phone.name)
        self.apps.switch_to_displayed_app()

        #Go to Contact list and Verify result
        contacts = self.phone.tap_contacts()

        # Check only one contact is created
        self.assertEqual(1, len(contacts.contacts))

        #  Tap on the new contact
        contact_details = contacts.contacts[0].tap()

        # Verify full name
        full_name = self.contact['givenName'] + " " + self.contact['familyName']
        self.assertEqual(contact_details.full_name, full_name)

        # Verify phone number
        self.assertEqual(contact_details.phone_number, self.contact['tel']['value'])
