# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time

from gaiatest import GaiaTestCase
from gaiatest.apps.settings.app import Settings
from gaiatest.utils.bluetooth.bluetooth_host import BluetoothHost


class TestBluetoothSettings(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

        # Bluetooth host object
        self.bluetooth_host = BluetoothHost(self.marionette)

        self.settings = Settings(self.marionette)
        self.settings.launch()
        self.bluetooth_settings = self.settings.open_bluetooth_settings()

    def tearDown(self):
        self.bluetooth_settings.unpair_all_devices()
        self.bluetooth_settings.disable_bluetooth()

    def test_toggle_bluetooth_settings(self):
        """Toggle Bluetooth via Settings - Networks & Connectivity

        https://moztrap.mozilla.org/manage/case/6071/
        """
        device_name = str(time.time())

        self.bluetooth_settings.enable_bluetooth()

        self.bluetooth_settings.tap_rename_my_device()
        self.bluetooth_settings.type_phone_name(device_name)
        self.bluetooth_settings.tap_update_device_name_ok()

        self.bluetooth_settings.enable_visible_to_all()

        # Now have host machine inquire and shouldn't find our device
        device_found = self.bluetooth_host.is_device_visible(device_name)
        self.assertTrue(device_found, "Host should see our device (device discoverable mode is ON)")

        remote_device_name = self.testvars['bluetooth']['ssid']
        self.bluetooth_settings.pair_device(remote_device_name)
        self.assertIn(remote_device_name, self.bluetooth_settings.connected_devices)
