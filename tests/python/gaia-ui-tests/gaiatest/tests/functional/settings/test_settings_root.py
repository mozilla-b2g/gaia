# This is Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.settings.app import Settings

class TestSettingsRoot(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.data_layer.disable_wifi()
        self.data_layer.bluetooth_disable()
        self.data_layer.set_setting('lockscreen.enabled', False)

    def test_settings_root_items(self):
        # Launchs settings
        settings = Settings(self.marionette)
        settings.launch()

        # This will take longer, so let's just wait for this
        self.wait_for_condition(lambda s: 'Turned off' in settings.bluetooth_menu_item_description)

        self.assertEqual(settings.wifi_menu_item_description, 'Disabled')
        self.assertEqual(settings.usb_storage_menu_item_description, 'Disabled')
        self.assertEqual(settings.screen_lock_menu_item_description, 'Disabled')
        self.assertEqual(settings.bluetooth_menu_item_description, 'Turned off')

        self.assertTrue(lambda s: '%' in settings.battery_menu_item_description)
        self.assertTrue(lambda s: 'available' in settings.application_storage_menu_item_description)
        self.assertTrue(lambda s: 'available' in settings.media_storage_menu_item_description)
        self.assertTrue(lambda s: 'English' in settings.language_menu_item_description)
