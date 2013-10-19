# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time

from gaiatest import GaiaTestCase
from gaiatest.mocks.mock_contact import MockContact

from gaiatest.apps.contacts.app import Contacts


class TestContacts(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

        self.contact = MockContact()
        self.data_layer.insert_contact(self.contact)

    def test_edit_contact(self):
        # https://moztrap.mozilla.org/manage/case/1310/
        # First insert a new contact to edit

        contacts_app = Contacts(self.marionette)
        contacts_app.launch()
        contacts_app.wait_for_contacts()

        contact_details = contacts_app.contact(self.contact['givenName'][0]).tap()

        edit_contact = contact_details.tap_edit()

        # Now we'll update the mock contact and then insert the new values into the UI
        self.contact['givenName'] = ['gaia%s' % repr(time.time()).replace('.', '')[10:]]
        self.contact['familyName'] = ["testedit"]
        self.contact['tel'][0]['value'] = "02011111111"

        # self.(*self._given_name_locator)

        edit_contact.type_given_name(self.contact['givenName'][0])
        edit_contact.type_family_name(self.contact['familyName'][0])
        edit_contact.type_phone(self.contact['tel'][0]['value'])

        contact_details = edit_contact.tap_update()

        contact_details.tap_back()

        self.assertEqual(len(contacts_app.contacts), 1)
        self.assertEqual(contacts_app.contacts[0].name, self.contact['givenName'][0])

        contact_details = contacts_app.contact(self.contact['givenName'][0]).tap()

        # Now assert that the values have updated
        full_name = self.contact['givenName'][0] + " " + self.contact['familyName'][0]

        self.assertEqual(contact_details.full_name,
                         full_name)
        self.assertEqual(contact_details.phone_number,
                         self.contact['tel'][0]['value'])
