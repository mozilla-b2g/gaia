# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.contacts.app import Contacts
from gaiatest.mocks.mock_contact import MockContact


class TestDeleteAllContacts(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

        self.data_layer.insert_contact(MockContact())
        self.data_layer.insert_contact(MockContact())

    def test_delete_all_contacts(self):
        """
        https://moztrap.mozilla.org/manage/case/15181/
        """

        contacts_app = Contacts(self.marionette)
        contacts_app.launch()
        contacts_app.wait_for_contacts(number_to_wait_for=2)

        contacts_settings = contacts_app.tap_settings()
        contacts_settings.tap_delete_contacts()

        contacts_app.tap_select_all()
        contacts_app.tap_delete()
        contacts_app.tap_confirm_delete()

        self.assertIn('2 contacts removed', contacts_app.status_message.lower())

        # We assert on the presence of this message instead of the length of contacts_app.contacts being 0
        # because Marionette times out when you look for 0 element matching a given CSS selector.
        # In other words, with assertEquals(len(contacts_app.contacts), 0), this test takes 40 seconds instead of 10.
        self.assertTrue(contacts_app.is_no_contacts_message_displayed)
