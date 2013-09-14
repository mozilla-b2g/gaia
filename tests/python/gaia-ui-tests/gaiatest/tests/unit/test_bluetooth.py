# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase


class TestBluetooth(GaiaTestCase):

    def test_bt_enabled_and_disabled(self):
        self.data_layer.bluetooth_enable()
        self.assertTrue(self.data_layer.bluetooth_is_enabled)

        self.data_layer.bluetooth_disable()
        self.assertFalse(self.data_layer.bluetooth_is_enabled)
