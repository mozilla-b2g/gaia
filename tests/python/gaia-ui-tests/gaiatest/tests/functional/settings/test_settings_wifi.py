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
        """
        https://moztrap.mozilla.org/manage/case/6075/
        """
        settings = Settings(self.marionette)
        settings.launch()
        wifi_settings = settings.open_wifi()

        self.assertFalse(wifi_settings.is_wifi_enabled, "WiFi should be disabled")
        wifi_settings.enable_wifi()
        self.assertTrue(wifi_settings.is_wifi_enabled, "WiFi should be enabled")
        wifi_settings.connect_to_network(self.testvars['wifi'])

        # verify that wifi is now on
        self.assertTrue(self.data_layer.is_wifi_connected(self.testvars['wifi']), "WiFi was not connected via Settings app")
