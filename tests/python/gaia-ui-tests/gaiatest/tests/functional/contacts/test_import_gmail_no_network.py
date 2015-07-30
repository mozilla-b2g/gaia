# -*- coding: iso-8859-15 -*-
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette import SkipTest

from gaiatest import GaiaTestCase
from gaiatest import GaiaTestEnvironment
from gaiatest.apps.contacts.app import Contacts
from gaiatest.apps.contacts.regions.settings_form import ConfirmationView


class TestImportGMailNoNetwork(GaiaTestCase):

    def setUp(self):
        if not GaiaTestEnvironment(self.testvars).email.get('gmail'):
            raise SkipTest('Gmail account details not present in test variables.')

        GaiaTestCase.setUp(self)
        self.connect_to_local_area_network()

    def test_import_gmail_no_network(self):
        '''
        https://moztrap.mozilla.org/manage/case/8986/
        '''
        contacts_app = Contacts(self.marionette)
        contacts_app.launch()

        contacts_settings = contacts_app.tap_settings()

        contacts_settings.tap_import_contacts()

        self.assertEqual(contacts_settings.gmail_imported_contacts, u'Not imported')
        gmail = contacts_settings.tap_import_from_gmail()

        # Login to gmail account
        gmail.switch_to_gmail_login_frame()

        email = self.environment.email['gmail']['email']
        password = self.environment.email['gmail']['password']

        gmail.gmail_login(email, password)
        contact_import_picker = gmail.tap_grant_access()

        # Import all contacts
        contact_import_picker.tap_select_all()
        contact_import_picker.tap_import_button(wait_for_import=False)

        self.disable_all_network_connections()
        self.apps.switch_to_displayed_app()

        confirmation_view = ConfirmationView(self.marionette)
        self.assertEqual(confirmation_view.error_message,
                         u'Friends\u2019 photos will not be added to your contacts. Continue anyway?')
