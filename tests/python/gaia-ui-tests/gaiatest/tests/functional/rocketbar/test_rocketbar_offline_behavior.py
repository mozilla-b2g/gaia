# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.system.app import System


class TestRocketBarOffline(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.data_layer.set_setting('search.suggestions.enabled', True)

    def test_rocketbar_offline_behavior(self):
        """
        https://moztrap.mozilla.org/manage/case/14601/
        """

        self.assertFalse(self.data_layer.is_wifi_connected())
        self.assertFalse(self.data_layer.is_cell_data_enabled)

        test_string = u'Test'

        search_panel = System(self.marionette).tap_search_bar()
        search_panel.type_into_search_box(test_string)

        self.assertTrue(search_panel.is_offline_message_visible)
        self.assertEqual(search_panel.offline_search_message, 'No internet connection')

        settings = search_panel.tap_offline_settings_button()

        settings.wait_for_airplane_mode_ready()
        self.assertTrue(settings.is_cell_data_menu_visible)
        self.assertTrue(settings.is_wifi_menu_visible)
        self.assertTrue(settings.is_airplane_mode_displayed)
