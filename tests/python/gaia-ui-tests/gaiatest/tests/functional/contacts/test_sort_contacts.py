# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.mocks.mock_contact import MockContact
from gaiatest.apps.contacts.app import Contacts


class TestContacts(GaiaTestCase):

    # contacts name list
    _contacts_name_list = [('GG', 'E'), ('AA', 'Z'), ('XX', 'C'), ('CC', 'X'), ('EE', 'G'), ('FF', 'F'), ('HH', 'D'), ('BB', 'Y'), ('YY', 'B'), ('ZZ', 'A'), ('DD', 'H')]

    def setUp(self):
        GaiaTestCase.setUp(self)

        # insert contacts by given names
        for contact_name in self._contacts_name_list:
            contact = MockContact(givenName=[contact_name[0]], familyName=[contact_name[1]])
            self.data_layer.insert_contact(contact)
        # prepare the sorted-by-first-name and sorted-by-last-name lists
        self.sorted_contacts_name_by_first = sorted(self._contacts_name_list, key=lambda name: name[0])
        self.sorted_contacts_name_by_last = sorted(self._contacts_name_list, key=lambda name: name[1])

    def test_sort_contacts(self):
        """ Test sorting of contacts

        https://github.com/mozilla/gaia-ui-tests/issues/467

        """

        contacts_app = Contacts(self.marionette)
        contacts_app.launch()
        contacts_app.wait_for_contacts(number_to_wait_for=len(self._contacts_name_list))

        # if "Order by last name" switch is on, turn off it
        contacts_settings = contacts_app.tap_settings()
        if contacts_settings.order_by_last_name:
            contacts_settings.tap_order_by_last_name()
        contacts_settings.tap_done()

        # sort by first name, compare with sorted-by-first-name list
        contact_items = contacts_app.contacts
        for idx in range(len(self._contacts_name_list)):
            name_tuple = self.sorted_contacts_name_by_first[idx]
            self.assertEqual(contact_items[idx].full_name, name_tuple[0] + " " + name_tuple[1], "Should order by first name.")

        # navigate to settings page
        contacts_settings = contacts_app.tap_settings()
        # turn on "Order by last name" switch
        contacts_settings.tap_order_by_last_name()
        # go to contacts main page from settings page
        contacts_settings.tap_done()

        # sort by last name, compare with sorted-by-last-name list
        contact_items = contacts_app.contacts
        for idx in range(len(self._contacts_name_list)):
            name_tuple = self.sorted_contacts_name_by_last[idx]
            self.assertEqual(contact_items[idx].full_name, name_tuple[0] + " " + name_tuple[1], "Should order by last name.")

        # navigate to settings page
        contacts_settings = contacts_app.tap_settings()
        # turn off "Order by last name" switch
        contacts_settings.tap_order_by_last_name()
        # go to contacts main page from settings page
        contacts_settings.tap_done()
