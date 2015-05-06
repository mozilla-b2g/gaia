# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette import SkipTest

from gaiatest import GaiaTestCase
from gaiatest.mocks.mock_contact import MockContact
from gaiatest.apps.contacts.app import Contacts


class TestContacts(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.connect_to_local_area_network()

        try:
            self.testvars['facebook']
        except KeyError:
            raise SkipTest('Facebook account details not present in test variables')

        self.contact = MockContact()
        self.data_layer.insert_contact(self.contact)

    def test_unlink_facebook_contact(self):
        """
        https://moztrap.mozilla.org/manage/case/5858/
        """

        username = self.testvars['facebook']['username']
        password = self.testvars['facebook']['password']
        contacts_app = Contacts(self.marionette)
        contacts_app.launch()
        contacts_app.wait_for_contacts()

        self.assertEqual(len(contacts_app.contacts), 1,
                         'Should insert one contact before running this test')

        # Go to contact item details
        contact_item = contacts_app.contact(self.contact['givenName'])
        contact_item_detail = contact_item.tap()

        facebook = contact_item_detail.tap_link_contact()
        contact_import_picker = facebook.login(username, password)
        contact_import_picker.tap_first_friend()

        contact_item_detail.tap_unlink_contact()
        contact_item_detail.tap_back()

        contacts_app.wait_for_contacts(2)
        self.assertEqual(len(contacts_app.contacts), 2,
                         'After unlinking the facebook contact should have been added')
