# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.camera.app import Camera
from gaiatest.apps.homescreen.regions.permission_dialog import PermissionDialog


class TestGeolocationPrompt(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.apps.set_permission('Camera', 'geolocation', 'prompt')

    def test_camera_geolocation_prompt(self):

        camera = Camera(self.marionette)
        camera.launch()

        permission = PermissionDialog(self.marionette)
        self.marionette.switch_to_default_content()
        permission.wait_for_permission_dialog_displayed()

        self.assertEqual(permission.permission_dialog_message,
                         '%s would like to know your location.' % camera.name)

        permission.tap_to_confirm_permission()

        current_permission = self.apps.get_permission('Camera', 'geolocation')
        self.assertEqual(current_permission, 'allow')
