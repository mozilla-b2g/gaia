# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase


class TestSettings(GaiaTestCase):

    def test_set_named_setting(self):
        setting_name = 'my.setting'

        self.data_layer.set_setting(setting_name, 'my.value')
        self.assertEquals(self.data_layer.get_setting(setting_name), 'my.value')

    def test_set_volume(self):
        channels = ['alarm', 'content', 'notification']

        for i in range(1, 11):
            value = i / 10.0
            self.data_layer.set_volume(value)
            for channel in channels:
                self.assertEqual(self.data_layer.get_setting('audio.volume.%s' % channel), value)

    def test_get_all_settings(self):
        all_settings = self.data_layer.all_settings
        self.assertTrue(all_settings)
        self.assertGreater(len(all_settings.keys()), 0)
