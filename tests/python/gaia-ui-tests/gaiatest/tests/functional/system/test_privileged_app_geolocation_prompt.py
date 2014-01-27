# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.ui_tests_privileged.app import UiTestsPivileged
from gaiatest.apps.homescreen.regions.permission_dialog import PermissionDialog


class TestPrivilegedAppGeolocationPrompt(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.apps.set_permission('UI tests - Privileged App', 'geolocation', 'prompt')


    def test_geolocation_prompt(self):
        uiTestsPrivileged = UiTestsPivileged(self.marionette)
        uiTestsPrivileged.launch()

        geolocation = uiTestsPrivileged.tap_geolocation_option()
        geolocation.switch_to_frame()
        geolocation.tap_find_location_button()

        permission = PermissionDialog(self.marionette)
        self.marionette.switch_to_default_content()
        permission.wait_for_permission_dialog_displayed()

        self.assertEqual(permission.permission_dialog_message,
                         u'UI tests - Privileged App would like to know your location.')

        permission.tap_to_confirm_permission()

        current_permission = self.apps.get_permission('UI tests - Privileged App', 'geolocation')
        self.assertEqual(current_permission, 'allow')
