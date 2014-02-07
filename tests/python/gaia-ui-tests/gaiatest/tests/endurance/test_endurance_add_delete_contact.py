# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

# Approximate runtime per 100 iterations: 88 minutes

import time

from gaiatest import GaiaEnduranceTestCase
from gaiatest.mocks.mock_contact import MockContact
from gaiatest.apps.contacts.app import Contacts


class TestEnduranceAddDeleteContact(GaiaEnduranceTestCase):

    def setUp(self):
        GaiaEnduranceTestCase.setUp(self)
        self.contacts = Contacts(self.marionette)
        self.contacts.launch()

    def test_endurance_add_delete_contact(self):
        self.drive(test=self.add_delete_contact, app='contacts')

    def add_delete_contact(self):
        # Add a new contact, most of this code borrowed from existing gaia-ui tests
        # Uses data from mock contact, except adds iteration to first name

        # Add new contact
        new_contact_form = self.contacts.tap_new_contact()

        # Enter data into fields
        contact = MockContact()
        contact['givenName'] = "%02dof%02d" % (self.iteration, self.iterations)
        new_contact_form.type_given_name(contact['givenName'])
        new_contact_form.type_family_name(contact['familyName'])
        new_contact_form.type_phone(contact['tel']['value'])
        new_contact_form.type_email(contact['email']['value'])
        new_contact_form.type_street(contact['adr']['streetAddress'])
        new_contact_form.type_zip_code(contact['adr']['postalCode'])
        new_contact_form.type_city(contact['adr']['locality'])
        new_contact_form.type_country(contact['adr']['countryName'])
        new_contact_form.type_comment(contact['note'])

        # Save new contact
        new_contact_form.tap_done()
        time.sleep(2)

        # Verify a new contact was added
        self.wait_for_condition(lambda m: len(self.contacts.contacts) == 1)

        # Wait a couple of seconds before deleting
        time.sleep(2)

        # Delete the contact
        contact_item = self.contacts.contact(contact['givenName'])
        contact_item_detail = contact_item.tap()
        contact_item_edit = contact_item_detail.tap_edit()
        contact_item_edit.tap_delete()
        contact_item_edit.tap_confirm_delete()
        time.sleep(1)

        self.assertEqual(len(self.contacts.contacts), 0, 'Should have no contacts.')

        # Wait a couple of seconds before the next iteration
        time.sleep(2)
