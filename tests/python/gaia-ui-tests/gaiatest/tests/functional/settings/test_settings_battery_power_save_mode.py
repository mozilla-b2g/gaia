# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.settings.app import Settings


class TestBatteryPowerSaveMode(GaiaTestCase):

    def test_settings_battery_power_save_mode(self):
        """
        https://moztrap.mozilla.org/manage/case/1406/
        """

        settings = Settings(self.marionette)
        settings.launch()
        battery_settings = settings.open_battery()

        # Asserting as a integer because this is how it's defined in the default value file.
        self.assertEqual(self.data_layer.get_setting('powersave.threshold'), -1)
        self.assertEqual(self.data_layer.get_setting('powersave.enabled'), False)


        battery_settings.tap_turn_on_auto()
        battery_settings.select('5% battery left')
        self.assertEqual(self.data_layer.get_setting('powersave.threshold'), '0.05')
        self.assertEqual(self.data_layer.get_setting('powersave.enabled'), False)

        battery_settings.tap_turn_on_auto()
        battery_settings.select('15% battery left')
        self.assertEqual(self.data_layer.get_setting('powersave.threshold'), '0.15')
        self.assertEqual(self.data_layer.get_setting('powersave.enabled'), False)

        battery_settings.tap_turn_on_auto()
        battery_settings.select('25% battery left')
        self.assertEqual(self.data_layer.get_setting('powersave.threshold'), '0.25')
        self.assertEqual(self.data_layer.get_setting('powersave.enabled'), False)

        battery_settings.tap_turn_on_auto()
        battery_settings.select('never')
        self.assertEqual(self.data_layer.get_setting('powersave.threshold'), '-1')
        self.assertEqual(self.data_layer.get_setting('powersave.enabled'), False)
