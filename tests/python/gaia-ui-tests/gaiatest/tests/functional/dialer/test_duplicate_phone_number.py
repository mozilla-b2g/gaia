# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait
from gaiatest import GaiaTestCase
from gaiatest.mocks.mock_contact import MockContact
from gaiatest.apps.phone.app import Phone
from gaiatest.apps.contacts.app import Contacts


class TestDuplicatePhoneNumber(GaiaTestCase):

    _iframe_locator = (By.CSS_SELECTOR, '.popupWindow.active iframe[data-url*="matching"]')
    _merge_button = (By.ID, 'merge-action')

    def setUp(self):
        GaiaTestCase.setUp(self)
        
        self.contact = MockContact(givenName='Test', tel=None)
        self.contact2 = MockContact(givenName=self.contact['givenName'], tel={
            'type': 'Mobile',
            'value': '123456789'})
        self.data_layer.insert_contact(self.contact)
        self.data_layer.insert_contact(self.contact2)

    def test_duplicate_phone_number(self):
        self.phone = Phone(self.marionette)
        self.phone.launch()

        number_to_add = self.contact2['tel']['value']
        self.phone.keypad.dial_phone_number(number_to_add)

        add_number = self.phone.keypad.tap_add_contact()
        contacts_app = add_number.tap_add_to_existing_contact()
        contacts_app.wait_for_contacts(2)
    
        edit_contact = contacts_app.contacts[0].tap(return_class='EditContact')
        duplicate_contact_found = edit_contact.tap_update(return_class='Merge')
        merge_contact = duplicate_contact_found.tap_on_merge()

        self.device.touch_home_button()

        contacts = Contacts(self.marionette)
        contacts.launch()
        contacts.wait_for_contacts(1)

        self.assertEqual(contacts_app.contacts[0].name, self.contact['givenName'])