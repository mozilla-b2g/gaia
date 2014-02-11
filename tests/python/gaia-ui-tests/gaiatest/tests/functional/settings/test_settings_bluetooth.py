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

    def test_toggle_bluetooth_settings(self):
        """Toggle Bluetooth via Settings - Networks & Connectivity

        https://moztrap.mozilla.org/manage/case/6071/
        """
        device_name = str(time.time())

        settings = Settings(self.marionette)
        settings.launch()

        bluetooth_settings = settings.open_bluetooth_settings()
        bluetooth_settings.enable_bluetooth()

        bluetooth_settings.tap_rename_my_device()
        bluetooth_settings.type_phone_name(device_name)
        bluetooth_settings.tap_update_device_name_ok()

        bluetooth_settings.enable_visible_to_all()

        # Now have host machine inquire and shouldn't find our device
        device_found = self.bluetooth_host.is_device_visible(device_name)
        self.assertTrue(device_found, "Host should see our device (device discoverable mode is ON)")
