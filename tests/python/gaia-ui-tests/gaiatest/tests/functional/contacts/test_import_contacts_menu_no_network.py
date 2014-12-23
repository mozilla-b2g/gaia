# -*- coding: iso-8859-15 -*-
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.contacts.app import Contacts


class TestImportContactsMenuNoNetwork(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

        self.connect_to_local_area_network()

    def test_import_contacts_menu_no_network(self):
        '''
        https://moztrap.mozilla.org/manage/case/15183/
        '''
        contacts_app = Contacts(self.marionette)
        contacts_app.launch()

        contacts_settings = contacts_app.tap_settings()

        contacts_settings.tap_import_contacts()

        self.assertFalse(contacts_settings.is_gmail_import_service_in_error)
        self.assertTrue(contacts_settings.is_gmail_import_enabled)

        self.assertFalse(contacts_settings.is_outlook_import_service_in_error)
        self.assertTrue(contacts_settings.is_outlook_import_enabled)

        self.assertFalse(contacts_settings.is_error_message_displayed)

        self.disable_all_network_connections()
        self.apps.switch_to_displayed_app()

        self.assertTrue(contacts_settings.is_gmail_import_service_in_error)
        self.assertFalse(contacts_settings.is_gmail_import_enabled)

        self.assertTrue(contacts_settings.is_outlook_import_service_in_error)
        self.assertFalse(contacts_settings.is_outlook_import_enabled)

        self.assertTrue(contacts_settings.is_error_message_displayed)
