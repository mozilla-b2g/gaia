# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.homescreen.app import Homescreen


class TestRocketBarOffline(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.apps.set_permission_by_url('app://search.gaiamobile.org/manifest.webapp', 'geolocation', 'deny')

        self.data_layer.set_setting('airplaneMode.enabled', True)

    def test_rocketbar_offline_behavior(self):
        """
        https://moztrap.mozilla.org/manage/case/14601/
        """

        self.assertTrue(self.data_layer.get_setting('airplaneMode.enabled'))

        test_string = u'Test'
        homescreen = Homescreen(self.marionette)
        self.apps.switch_to_displayed_app()

        search_panel = homescreen.tap_search_bar()
        search_panel.type_into_search_box(test_string)

        self.assertTrue(search_panel.is_offline_message_visible)
        self.assertEqual(search_panel.offline_search_message, 'No internet connection')

        settings = search_panel.tap_offline_settings_button()

        settings.wait_for_airplane_toggle_ready()
        self.assertTrue(settings.is_cell_data_menu_visible)
        self.assertTrue(settings.is_wifi_menu_visible)
        self.assertTrue(settings.is_airplane_mode_visible)
