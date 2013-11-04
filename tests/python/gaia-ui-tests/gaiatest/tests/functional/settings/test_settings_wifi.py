# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.settings.app import Settings


class TestSettingsWifi(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.data_layer.disable_wifi()

    def test_connect_to_wifi_via_settings_app(self):
        """ Connect to a wifi network via the Settings app

        https://github.com/mozilla/gaia-ui-tests/issues/342

        """
        settings = Settings(self.marionette)
        settings.launch()
        wifi_settings = settings.open_wifi_settings()

        wifi_settings.enable_wifi()
        wifi_settings.connect_to_network(self.testvars['wifi'])

        # verify that wifi is now on
        self.assertTrue(self.data_layer.is_wifi_connected(self.testvars['wifi']), "WiFi was not connected via Settings app")
