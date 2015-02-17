# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.ftu.app import Ftu
from gaiatest.apps.homescreen.app import Homescreen


class TestFtuAccessibility(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.ftu = Ftu(self.marionette)
        self.ftu.launch()

    def test_a11y_ftu(self):
        # This test runs on TBPL only (device is covered by test_a11y_ftu.py)

        self.wait_for_condition(lambda m: self.ftu.languages_list > 0,
                                message='No languages listed on screen')

        # Select different languages
        self.ftu.a11y_click_language('en-US')
        self.assertEqual(self.ftu.selected_language, 'en-US')

        self.ftu.a11y_click_next_to_wifi_section()
        self.ftu.a11y_click_next_to_timezone_section()
        self.ftu.a11y_click_next_to_geolocation_section()
        self.ftu.a11y_click_next_to_import_contacts_section()
        self.ftu.a11y_click_next_to_firefox_accounts_section()
        self.ftu.a11y_click_next_to_welcome_browser_section()

        # Tap the statistics box and check that it sets a setting
        self.ftu.a11y_click_statistics_checkbox()
        self.wait_for_condition(
            lambda m: not self.data_layer.get_setting('debug.performance_data.shared'),
            message='Share performance data was not set')
        self.ftu.a11y_click_statistics_checkbox()
        self.wait_for_condition(
            lambda m: self.data_layer.get_setting('debug.performance_data.shared'),
            message='Share performance data was not unset')

        self.ftu.a11y_click_next_to_privacy_browser_section()
        self.ftu.a11y_click_next_to_finish_section()

        # Skip the tour
        self.ftu.a11y_click_skip_tour()

        # Switch back to top level now that FTU app is gone
        self.wait_for_condition(lambda m: self.apps.displayed_app.name == Homescreen.name)
