# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.settings.app import Settings


class TestBluetoothSettings(GaiaTestCase):

    def test_toggle_bluetooth_settings(self):
        """ Toggle Bluetooth via Settings - Networks & Connectivity

        https://moztrap.mozilla.org/manage/case/3346/

        """
        settings = Settings(self.marionette)
        settings.launch()
        bluetooth_settings = settings.open_bluetooth_settings()

        self.assertFalse(bluetooth_settings.is_bluetooth_enabled)
        bluetooth_settings.enable_bluetooth()

        self.assertTrue(self.data_layer.get_setting('bluetooth.enabled'))

    def tearDown(self):

        # Disable Bluetooth
        self.data_layer.set_setting('bluetooth.enabled', False)

        GaiaTestCase.tearDown(self)
