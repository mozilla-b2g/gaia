# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.ui_tests_privileged.app import UiTestsPivileged
from gaiatest.apps.homescreen.regions.permission_dialog import PermissionDialog


class TestPrivilegedAppContactsPrompt(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.apps.set_permission('UI tests - Privileged App', 'contacts-read', 'prompt')
        self.apps.set_permission('UI tests - Privileged App', 'contacts-write', 'prompt')


    def test_contact_prompt(self):
        uiTestsPrivileged = UiTestsPivileged(self.marionette)
        uiTestsPrivileged.launch()

        contacts = uiTestsPrivileged.tap_contacts_option()
        contacts.switch_to_frame()
        contacts.tap_insert_fake_contacts()

        permission = PermissionDialog(self.marionette)
        self.marionette.switch_to_default_content()
        permission.wait_for_permission_dialog_displayed()

        self.assertEqual(permission.permission_dialog_message,
                         u'UI tests - Privileged App would like to access your contact list.')

        permission.tap_to_confirm_permission()

        read_permission = self.apps.get_permission('UI tests - Privileged App', 'contacts-read')
        self.assertEqual(read_permission, 'allow')

        write_permission = self.apps.get_permission('UI tests - Privileged App', 'contacts-write')
        self.assertEqual(write_permission, 'allow')
