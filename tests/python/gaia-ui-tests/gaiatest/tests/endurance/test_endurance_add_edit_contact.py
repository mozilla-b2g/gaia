# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

# Approximate runtime per 100 iterations: xxx minutes

import time

from gaiatest import GaiaEnduranceTestCase
from gaiatest.mocks.mock_contact import MockContact
from gaiatest.apps.contacts.app import Contacts


class TestEnduranceAddEditContact(GaiaEnduranceTestCase):

    def setUp(self):
        GaiaEnduranceTestCase.setUp(self)

        # Remove any existing contacts
        self.data_layer.remove_all_contacts(60000)

        # Launch the Contacts app
        self.contacts = Contacts(self.marionette)
        self.contacts.launch()

        self.contact = MockContact()

    def test_endurance_add_edit_contact(self):
        self.drive(test=self.add_edit_contact, app='contacts')

    def add_edit_contact(self):
        # Add a new contact, most of this code borrowed from test_add_new_contact
        # Uses data from mock contact, except adds iteration to first name

        # Add new contact
        new_contact_form = self.contacts.tap_new_contact()
        original_name = self.contact.givenName
        extra_text = "-%dof%d" % (self.iteration, self.iterations)
        self.contact.givenName = self.contact.givenName + extra_text

        # Enter data into fields
        new_contact_form.type_given_name(self.contact.givenName)
        new_contact_form.type_family_name(self.contact.familyName)
        new_contact_form.type_phone(self.contact.tel['value'])
        new_contact_form.type_email(self.contact.email)
        new_contact_form.type_street(self.contact.street)
        new_contact_form.type_zip_code(self.contact.zip)
        new_contact_form.type_city(self.contact.city)
        new_contact_form.type_country(self.contact.country)
        new_contact_form.type_comment(self.contact.comment)

        # Save new contact
        new_contact_form.tap_done()

        # Verify a new contact was added
        self.wait_for_condition(lambda m: len(self.contacts.contacts) == self.iteration)

        # Wait a couple of seconds before editing
        time.sleep(2)

        contact_details = self.contacts.contact(self.contact.givenName).tap()
        edit_contact = contact_details.tap_edit()

        # Now we'll update the mock contact and then insert the new values into the UI
        self.contact.givenName = self.contact.givenName + " - edit"
        edit_contact.type_given_name(self.contact.givenName)

        contact_details = edit_contact.tap_update()
        contact_details.tap_back()

        self.assertEqual(len(self.contacts.contacts), self.iteration)
        contact_details = self.contacts.contact(self.contact.givenName).tap()

        # Now assert that the values have updated
        full_name = self.contact.givenName + " " + self.contact.familyName
        self.assertEqual(contact_details.full_name, full_name)

        # Back to main contacts list
        contact_details.tap_back()

        # Set mock contact name back to original, for next rep
        self.contact.givenName = original_name

        # Sleep between reps
        time.sleep(3)
