# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time

from gaiatest import GaiaTestCase
from gaiatest.apps.settings.app import Settings


class TestBluetoothSettings(GaiaTestCase):

    def test_toggle_bluetooth_settings(self):
        """Toggle Bluetooth via Settings - Networks & Connectivity

        https://moztrap.mozilla.org/manage/case/6071/
        """
        device_name = str(time.time())

        settings = Settings(self.marionette)
        settings.launch()

        self.assertFalse(self.data_layer.bluetooth_is_enabled)

        bluetooth_settings = settings.open_bluetooth_settings()
        bluetooth_settings.enable_bluetooth()

        self.assertTrue(self.data_layer.bluetooth_is_enabled)

        bluetooth_settings.tap_rename_my_device()
        bluetooth_settings.type_phone_name(device_name)
        bluetooth_settings.tap_update_device_name_ok()

        self.assertEquals(bluetooth_settings.device_name, device_name)

        bluetooth_settings.enable_visible_to_all()

        self.assertTrue(self.data_layer.bluetooth_is_discoverable)
        self.assertEquals(self.data_layer.bluetooth_name, device_name)
