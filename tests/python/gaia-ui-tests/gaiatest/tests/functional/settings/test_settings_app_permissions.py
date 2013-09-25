# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.settings.app import Settings


class TestAppPermissions(GaiaTestCase):

    def test_open_app_permissions(self):

        settings = Settings(self.marionette)
        settings.launch()
        app_permissions_settings = settings.open_app_permissions_settings()

        # Tap on the app to open permissions details
        app_permissions_details = app_permissions_settings.tap_app('Homescreen')

        # Verify the permission is listed
        self.assertTrue(app_permissions_details.is_geolocation_listed)
