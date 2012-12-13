# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase


class TestWiFiSettings(GaiaTestCase):

    def test_set_wifi(self):
        setting_name = 'wifi.enabled'

        self.data_layer.enable_wifi()
        self.assertTrue(self.data_layer.get_setting(setting_name))

        self.data_layer.disable_wifi()
        self.assertFalse(self.data_layer.get_setting(setting_name))
