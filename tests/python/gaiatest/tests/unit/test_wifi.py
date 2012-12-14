# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase


class TestWiFi(GaiaTestCase):

    def test_connect_and_forget_all_networks(self):
        self.network = self.testvars['wifi']
        self.data_layer.enable_wifi()
        self.data_layer.connect_to_wifi(self.network)
        self.data_layer.forget_all_networks()
        self.assertEqual(self.data_layer.known_networks, [{}])
        self.assertFalse(self.data_layer.is_wifi_connected(self.network))
        self.data_layer.disable_wifi()
