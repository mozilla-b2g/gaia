# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase


class TestSettings(GaiaTestCase):

    def test_set_named_setting(self):
        setting_name = 'my.setting'

        self.lockscreen.unlock()

        self.data_layer.set_setting(setting_name, 'my.value')
        self.assertEquals(self.data_layer.get_setting(setting_name), 'my.value')

    def test_set_cell_data(self):
        setting_name = 'ril.data.enabled'

        self.lockscreen.unlock()

        self.data_layer.enable_cell_data()
        self.assertTrue(self.data_layer.get_setting(setting_name))

        self.data_layer.disable_cell_data()
        self.assertFalse(self.data_layer.get_setting(setting_name))

    def test_set_cell_roaming(self):
        setting_name = 'ril.data.roaming_enabled'

        self.lockscreen.unlock()

        self.data_layer.enable_cell_roaming()
        self.assertTrue(self.data_layer.get_setting(setting_name))

        self.data_layer.disable_cell_roaming()
        self.assertFalse(self.data_layer.get_setting(setting_name))

    def test_set_wifi(self):
        setting_name = 'wifi.enabled'

        self.lockscreen.unlock()

        self.data_layer.enable_wifi()
        self.assertTrue(self.data_layer.get_setting(setting_name))

        self.data_layer.disable_wifi()
        self.assertFalse(self.data_layer.get_setting(setting_name))

    def test_set_volume(self):
        setting_name = 'audio.volume.master'

        self.lockscreen.unlock()

        for i in range(1, 11):
            value = i / 10.0
            self.data_layer.set_volume(value)
            self.assertEqual(self.data_layer.get_setting(setting_name), value)
