# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

# Approximate runtime per 100 iterations: 85 minutes

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
        mock_contact = MockContact()
        extra_text = "-%dof%d" % (self.iteration, self.iterations)
        new_contact_form.type_given_name(mock_contact.givenName + extra_text)        
        new_contact_form.type_family_name(mock_contact.familyName)
        new_contact_form.type_phone(mock_contact.tel['value'])
        new_contact_form.type_email(mock_contact.email)
        new_contact_form.type_street(mock_contact.street)
        new_contact_form.type_zip_code(mock_contact.zip)
        new_contact_form.type_city(mock_contact.city)
        new_contact_form.type_country(mock_contact.country)
        new_contact_form.type_comment(mock_contact.comment)

        # Save new contact
        new_contact_form.tap_done()

        # Verify a new contact was added
        self.wait_for_condition(lambda m: len(self.contacts.contacts) == 1)

        # Wait a couple of seconds before deleting
        time.sleep(2)

        contact = self.contacts.contact(mock_contact.givenName + extra_text)
        edit_contact = contact.tap().tap_edit()
        edit_contact.tap_delete()
        edit_contact.tap_confirm_delete()

        self.assertEqual(len(self.contacts.contacts), 0, 'Should have no contacts.')

        # Wait a couple of seconds before the next iteration
        time.sleep(2)
