# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette import By

from gaiatest import GaiaTestCase
from gaiatest.apps.homescreen.regions.permission_dialog import PermissionDialog


class TestGeolocationPrompt(GaiaTestCase):

    _geoloc_start_button_locator = (By.ID, 'btnStart')

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.apps.set_permission('Geoloc', 'geolocation', 'prompt')

    def test_geolocation_prompt(self):

        self.app = self.apps.launch('Geoloc')
        self.marionette.find_element(*self._geoloc_start_button_locator).tap()

        permission = PermissionDialog(self.marionette)
        self.marionette.switch_to_default_content()
        permission.wait_for_permission_dialog_displayed()

        self.assertEqual(permission.permission_dialog_message,
                         'Geoloc would like to know your location.')

        permission.tap_to_confirm_permission()

        current_permission = self.apps.get_permission('Geoloc', 'geolocation')
        self.assertEqual(current_permission, 'allow')
