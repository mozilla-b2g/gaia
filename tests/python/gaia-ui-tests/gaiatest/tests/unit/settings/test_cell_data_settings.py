# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase


class TestCellDataSettings(GaiaTestCase):

    def test_set_cell_data(self):
        self.assertFalse(self.device.is_online)
        self.data_layer.connect_to_cell_data()
        self.assertTrue(self.data_layer.is_cell_data_enabled)
        self.assertTrue(self.data_layer.is_cell_data_connected)
        self.assertTrue(self.device.is_online)

        self.data_layer.disable_cell_data()
        self.assertFalse(self.data_layer.is_cell_data_enabled)
