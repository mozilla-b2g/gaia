# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.settings.app import Settings


class TestPowerSaveMode(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.data_layer.disable_wifi()
        self.data_layer.connect_to_cell_data()
        self.data_layer.connect_to_wifi()
        self.data_layer.set_setting('geolocation.enabled', 'true')
        self.data_layer.set_setting('bluetooth.enabled', 'true')

    def test_power_save_mode(self):
        settings = Settings(self.marionette)
        settings.launch()

        # Tap on Battery menu item.
        battery_settings = settings.open_battery_settings()
        battery_settings.toggle_power_save_mode()

        # Wait for Cell Data to be disabled.
        self.wait_for_condition(lambda m: not self.data_layer.is_cell_data_connected)

        # Check if Wi-Fi is disabled.
        self.assertFalse(self.data_layer.is_wifi_connected(self.testvars['wifi']))

        # Check if Cell Data is disabled.
        self.assertFalse(self.data_layer.get_setting('ril.data.enabled'))

        # Check if GPS is disabled.
        self.assertFalse(self.data_layer.get_setting('geolocation.enabled'),)

        # Check if Bluetooth is diabled.
        self.assertFalse(self.data_layer.get_setting('bluetooth.enabled'))
