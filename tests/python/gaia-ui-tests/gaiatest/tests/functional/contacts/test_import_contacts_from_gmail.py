# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.marionette_test import SkipTest
from gaiatest import GaiaTestCase
from gaiatest.apps.contacts.app import Contacts


class TestImportContactsFromGmail(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)
        try:
            self.testvars['email']['gmail']
        except KeyError:
            raise SkipTest('account details not present in test variables')
        self.connect_to_network()

    def test_import_contacts_from_gmail(self):

        email = self.testvars['email']['gmail']['email']
        password = self.testvars['email']['gmail']['password']
        contacts_app = Contacts(self.marionette)
        contacts_app.launch()

        # Go on Contacts Settings page
        contacts_settings = contacts_app.tap_settings()

        # Tap Import Contacts
        contacts_settings.tap_import_contacts()

        # Check there are no gmail contacts imported
        self.assertEqual(contacts_settings.gmail_imported_contacts, u'Not imported')
        gmail = contacts_settings.tap_import_from_gmail()

        # Login to gmail account
        gmail.switch_to_gmail_login_frame()
        contacts_import = gmail.gmail_login(email, password)

        # Import first contact
        contacts_import.switch_to_select_contacts_frame()
        contacts_import.tap_first_contact()
        contacts_settings = contacts_import.tap_import_button()
        contacts_settings.tap_back_from_import_contacts()
        contacts_settings.tap_done()

        # Check there is one gmail contact imported
        self.assertEqual(len(contacts_app.contacts), 1)
