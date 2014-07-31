# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.phone.app import Phone
from gaiatest.mocks.mock_contact import MockContact


class TestAccessibilityPhoneEditContact(GaiaTestCase):

    def setUp(self):
        # Start application in Phone App
        GaiaTestCase.setUp(self)
        self.phone = Phone(self.marionette)
        self.phone.launch()

    def test_a11y_phone_edit_contact(self):

        # Add a random contact
        contacts = self.phone.a11y_click_contacts()

        # Add new contact
        new_contact_form = contacts.a11y_click_new_contact()

        # Enter data into fields
        contact = MockContact()
        new_contact_form.type_given_name(contact['givenName'])

        # Save new contact
        new_contact_form.a11y_click_done()
        self.wait_for_condition(lambda m: len(contacts.contacts) == 1)

        # Edit the contact
        contact_item = contacts.contact(contact['givenName'])
        contact_item_detail = contact_item.a11y_click()
        contact_item_edit = contact_item_detail.a11y_click_edit()

        self.apps.switch_to_displayed_app()
        # Now check if toolbar is visible by Screen Reader

        # Keypad is hidden from the screen reader.
        self.assertTrue(self.accessibility.is_hidden(self.marionette.find_element(
            *self.phone._keypad_toolbar_button_locator)))
        # Contacts is visible to the screen reader.
        self.assertTrue(self.accessibility.is_hidden(self.marionette.find_element(
            *self.phone._contacts_view_locator)))
        # Call log is hidden from the screen reader.
        self.assertTrue(self.accessibility.is_hidden(self.marionette.find_element(
            *self.phone._call_log_toolbar_button_locator)))
