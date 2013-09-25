# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase


class TestCellRoamingSettings(GaiaTestCase):

    def test_set_cell_roaming(self):
        setting_name = 'ril.data.roaming_enabled'

        self.data_layer.enable_cell_roaming()
        self.assertTrue(self.data_layer.get_setting(setting_name))

        self.data_layer.disable_cell_roaming()
        self.assertFalse(self.data_layer.get_setting(setting_name))
