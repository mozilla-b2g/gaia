# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.mocks.mock_contact import MockContact
from gaiatest.apps.contacts.app import Contacts


class TestContacts(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

        # insert contact
        self.contact = MockContact()
        self.data_layer.insert_contact(self.contact)

    def test_delete_contact(self):
        contacts_app = Contacts(self.marionette)
        contacts_app.launch()
        contacts_app.wait_for_contacts()

        pre_contacts_count = len(contacts_app.contacts)
        self.assertEqual(pre_contacts_count, 1,
                         'Should insert one contact before running this test')

        contact_item = contacts_app.contact(self.contact['givenName'])
        contact_item_detail = contact_item.tap()
        contact_item_edit = contact_item_detail.tap_edit()
        contact_item_edit.tap_delete()
        contact_item_edit.tap_confirm_delete()

        self.wait_for_condition(
            lambda m: len(self.data_layer.all_contacts) == 0,
            message='Should have no contacts after running this test')

        post_contacts_count = len(contacts_app.contacts)
        self.assertEqual(post_contacts_count, 0,
                         'Should have no contacts after running this test')
