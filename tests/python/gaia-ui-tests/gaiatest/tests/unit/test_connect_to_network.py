# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase


class TestConnectToNetwork(GaiaTestCase):

    def test_connect_to_network(self):
        self.assertFalse(self.device.is_online)
        self.connect_to_network()
        self.assertTrue(self.device.is_online)
