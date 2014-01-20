# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

# Approximate runtime per 100 iterations: 90 minutes

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

    def test_endurance_add_edit_contact(self):
        self.drive(test=self.add_edit_contact, app='contacts')

    def add_edit_contact(self):
        # Add a new contact, most of this code borrowed from test_add_new_contact
        # Uses data from mock contact, except adds iteration to first name
        contact = MockContact()

        # Add new contact
        new_contact_form = self.contacts.tap_new_contact()

        # Enter data into fields
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
        self.wait_for_condition(lambda m: len(self.contacts.contacts) == self.iteration)

        # Wait a couple of seconds before editing
        time.sleep(2)

        # Edit the contact
        contact_item = self.contacts.contact(contact['givenName'])
        contact_item_detail = contact_item.tap()
        contact_item_edit = contact_item_detail.tap_edit()

        # Now we'll update the mock contact and then insert the new values into the UI
        contact['givenName'] = '%s EDITED' %contact['givenName']
        contact_item_edit.type_given_name(contact['givenName'])

        contact_details = contact_item_edit.tap_update()
        time.sleep(2)
        contact_details.tap_back()
        time.sleep(2)

        self.assertEqual(len(self.contacts.contacts), self.iteration)
        contact_details = self.contacts.contact(contact['givenName']).tap()

        # Now assert that the values have updated
        expected_name = contact['givenName'] + " " + contact['familyName']
        self.assertEqual(expected_name, contact_details.full_name)

        # Back to main contacts list
        contact_details.tap_back()

        # Sleep between reps
        time.sleep(3)
