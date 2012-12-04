# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase


class TestWiFi(GaiaTestCase):

    def test_connect_and_forget(self):
        network = self.testvars['wifi']

        self.data_layer.enable_wifi()
        self.data_layer.connect_to_wifi(network)
        self.assertTrue(self.data_layer.is_wifi_connected(network))
        self.data_layer.forget_wifi(network)
        self.assertFalse(self.data_layer.is_wifi_connected(network))
        self.data_layer.disable_wifi()
