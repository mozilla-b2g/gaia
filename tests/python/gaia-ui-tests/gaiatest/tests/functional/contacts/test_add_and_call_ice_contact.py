# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.mocks.mock_contact import MockContact
from gaiatest.apps.contacts.app import Contacts


class TestAddAndCallIceContact(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

        self.contact = MockContact(tel={
            'type': 'Mobile',
            'value': "%s" % self.testvars['remote_phone_number']})
        self.data_layer.insert_contact(self.contact)

    def test_add_and_call_ice_contact(self):
        contacts_app = Contacts(self.marionette)
        contacts_app.launch()
        contacts_app.wait_for_contacts()

        contacts_settings = contacts_app.tap_settings()
        ice_contact_menu = contacts_settings.tap_set_ice_contact()
        ice_contact_select = ice_contact_menu.enable_set_ice_contact()

        contacts_app = ice_contact_select.select_ice_contact()
        contacts_app.wait_for_contacts(1)
        contact_selected = contacts_app.contacts[0].tap(return_class='SetIceContacts')
        settings = contact_selected.go_back()
        contact_list = settings.tap_done()

        self.assertTrue(contact_list.is_ice_list_icon_displayed)
        self.assertEqual(len(contact_list.contacts), 1)
        self.assertEqual(contact_list.contacts[0].full_name, (self.contact['givenName'] + ' ' + self.contact['familyName']))
        
        ice_contact = contact_list.open_ice_contact_list()
        ice_contact.wait_for_ice_contact_shown()
       
        ice_contact_details = contacts_app.contact(self.contact['givenName']).tap()
        call_screen = ice_contact_details.tap_phone_number()
        call_screen.wait_for_outgoing_call()
        call_screen.hang_up()
