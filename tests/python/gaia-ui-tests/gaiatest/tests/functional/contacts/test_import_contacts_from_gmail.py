# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette import SkipTest

from gaiatest import GaiaTestCase
from gaiatest import GaiaTestEnvironment
from gaiatest.apps.contacts.app import Contacts


class TestImportContactsFromGmail(GaiaTestCase):

    def setUp(self):
        if not GaiaTestEnvironment(self.testvars).email.get('gmail'):
            raise SkipTest('Gmail account details not present in test variables.')

        GaiaTestCase.setUp(self)
        self.connect_to_local_area_network()

    def test_import_contacts_from_gmail(self):

        email = self.environment.email['gmail']['email']
        password = self.environment.email['gmail']['password']
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
        gmail.gmail_login(email, password)
        contact_import_picker = gmail.tap_grant_access()

        # Import all contacts
        contact_import_picker.tap_select_all()
        contacts_settings = contact_import_picker.tap_import_button()
        contacts_settings.tap_back_from_import_contacts()
        contacts_settings.tap_done()

        self.assertGreater(len(contacts_app.contacts), 1)
