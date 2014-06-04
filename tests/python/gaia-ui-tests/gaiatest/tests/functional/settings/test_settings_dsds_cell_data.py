# This is Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest import GaiaTestCase
from gaiatest.apps.settings.app import Settings


class TestDSDSCellData(GaiaTestCase):

    def test_cell_data_for_two_sims(self):
        """https://moztrap.mozilla.org/manage/case/10687/"""
              
        # Launchs settings
        settings = Settings(self.marionette)
        settings.launch()

        # Open cell data settings
        cell_and_data_settings = settings.open_cell_and_data_settings()

        # Go into SIM 1
        cell_and_data_settings.select_sim(1)

        # Verify that a carrier is displayed
        self.assertTrue(len(cell_and_data_settings.carrier_name) > 0)

        # Back to previous page
        cell_and_data_settings.go_back()
 
        # Go into SIM 2
        cell_and_data_settings.select_sim(2)

        # Verify that a carrier is displayed
        self.assertTrue(len(cell_and_data_settings.carrier_name) > 0)
