# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import Wait

from gaiatest import GaiaTestCase
from gaiatest.mocks.mock_contact import MockContact
from gaiatest.apps.contacts.app import Contacts


class TestDefaultContactImage(GaiaTestCase):

    def test_default_contact_image(self):
        """
        https://moztrap.mozilla.org/manage/case/14399/
        """

        contact = MockContact()

        contacts_app = Contacts(self.marionette)
        contacts_app.launch()

        new_contact_form = contacts_app.tap_new_contact()
        new_contact_form.type_given_name(contact['givenName'])
        new_contact_form.type_family_name(contact['familyName'])
        new_contact_form.tap_done()

        Wait(self.marionette).until(lambda m: len(contacts_app.contacts) == 1)
        first_letter = contact['givenName'][:1].upper()
        Wait(self.marionette).until(lambda m: contacts_app.contacts[0].image_data_group == first_letter)
