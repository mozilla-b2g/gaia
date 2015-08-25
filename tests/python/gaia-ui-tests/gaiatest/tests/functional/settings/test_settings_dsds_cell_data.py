# This is Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.settings.app import Settings
from gaiatest.apps.system.app import System


class TestDSDSCellData(GaiaTestCase):

    def test_cell_data_for_one_sim_in_dsds_device(self):
        """
        https://moztrap.mozilla.org/manage/case/1373/
        """

        settings = Settings(self.marionette)
        settings.launch()

        cell_and_data_settings = settings.open_cell_and_data_dual_sim()
        self.assertNotEqual(cell_and_data_settings.carrier_name, '')

        cell_data_prompt = cell_and_data_settings.enable_data()
        cell_data_prompt.turn_on()
        self.wait_for_condition(lambda m: cell_and_data_settings.is_data_toggle_checked)

        status_bar = System(self.marionette).status_bar.minimized
        status_bar.wait_for_data_to_be_connected()
