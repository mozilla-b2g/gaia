# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.settings.app import Settings


class TestSettingsWifi(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.data_layer.disable_wifi()

    def test_connect_to_first_opened_network(self):
        settings = Settings(self.marionette)
        settings.launch()
        wifi_settings = settings.open_wifi_settings()

        wifi_settings.enable_wifi()
        network_ssid = wifi_settings.connect_to_first_opened_network()
        network = {u'ssid': network_ssid}

        # verify that wifi is now on
        self.assertTrue(self.data_layer.is_wifi_connected(network), "WiFi was not connected via Settings app")
