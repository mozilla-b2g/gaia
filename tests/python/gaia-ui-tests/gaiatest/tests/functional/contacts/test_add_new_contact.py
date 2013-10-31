# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase

from gaiatest.mocks.mock_contact import MockContact
from gaiatest.apps.contacts.app import Contacts


class TestContacts(GaiaTestCase):

    def test_add_new_contact(self):
        # https://moztrap.mozilla.org/manage/case/1309/
        self.contact = MockContact()

        contacts_app = Contacts(self.marionette)
        contacts_app.launch()

        new_contact_form = contacts_app.tap_new_contact()

        # Enter data into fields
        new_contact_form.type_given_name(self.contact['givenName'])
        new_contact_form.type_family_name(self.contact['familyName'])

        new_contact_form.type_phone(self.contact['tel'][0]['value'])
        new_contact_form.type_email(self.contact['email'][0]['value'])
        new_contact_form.type_street(self.contact['adr'][0]['streetAddress'])
        new_contact_form.type_zip_code(self.contact['adr'][0]['postalCode'])
        new_contact_form.type_city(self.contact['adr'][0]['locality'])
        new_contact_form.type_country(self.contact['adr'][0]['countryName'])
        new_contact_form.type_comment(self.contact['note'])

        new_contact_form.tap_done()
        self.wait_for_condition(lambda m: len(contacts_app.contacts) == 1)

        self.assertEqual(contacts_app.contacts[0].name, self.contact['givenName'][0])
