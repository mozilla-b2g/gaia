# This is Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import By
from gaiatest import GaiaTestCase
from gaiatest.apps.settings.app import Settings


class TestDSDSCellData(GaiaTestCase):

    def test_cell_data_for_two_sims(self):
        """
        https://moztrap.mozilla.org/manage/case/1373/
        We only test with 1 SIM in the device
        """

        settings = Settings(self.marionette)
        settings.launch()

        # Open cell data settings
        cell_and_data_settings = settings.open_cell_and_data_settings()

        # verify that a carrier is displayed
        self.assertTrue(len(cell_and_data_settings.carrier_name) > 0)

        cell_data_prompt = cell_and_data_settings.enable_data()

        # deal with prompt that sometimes appears (on first setting)
        if cell_data_prompt.is_displayed:
            # Cell data should not be enabled until we turn it on via the prompt
            self.assertFalse(self.data_layer.get_setting('ril.data.enabled'), "Cell data was enabled before responding to the prompt")
            cell_data_prompt.turn_on()

        # Wait for cell data to be turned on
        self.wait_for_condition(lambda m: cell_and_data_settings.is_data_toggle_checked)

        # verify that cell data is now enabled and connected
        self.assertTrue(self.data_layer.is_cell_data_enabled, "Cell data was not enabled via Settings app")
        self.wait_for_condition(
            lambda m: self.data_layer.is_cell_data_connected,
            message='Cell data was not connected via Settings app')
