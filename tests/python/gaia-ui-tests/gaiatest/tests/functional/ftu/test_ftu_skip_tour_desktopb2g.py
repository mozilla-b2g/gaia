# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.ftu.app import Ftu
from gaiatest.apps.homescreen.app import Homescreen


class TestFtu(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

        self.ftu = Ftu(self.marionette)
        self.ftu.launch()

    def test_ftu_skip_tour_for_desktop(self):

        self.wait_for_condition(lambda m: self.ftu.languages_list > 0, message="No languages listed on screen")

        # select en-US due to the condition of this test is only for en-US
        self.ftu.tap_language("en-US")

        # Tap next
        self.ftu.tap_next_to_wifi_section()

        # Set timezone
        self.ftu.tap_next_to_timezone_section()
        self.ftu.set_timezone_continent("Asia")
        self.ftu.set_timezone_city("Almaty")
        # Bug 976570 - [ desktop b2g] Continent and city changes not visible in FTU menu
        # self.assertEqual(self.ftu.timezone_title, "UTC+06:00 Asia/Almaty")

        # Verify Geolocation section appears
        self.ftu.tap_next_to_geolocation_section()

        # Disable geolocation
        self.ftu.disable_geolocation()
        self.ftu.tap_next_to_import_contacts_section()

        self.ftu.tap_next_to_firefox_accounts_section()

        self.ftu.tap_next_to_welcome_browser_section()

        self.ftu.tap_statistics_checkbox()
        self.assertFalse(self.data_layer.get_setting('debug.performance_data.shared'))
        self.ftu.tap_next_to_privacy_browser_section()

        # Enter a dummy email address and check it set inside the os
        # TODO assert that this is preserved in the system somewhere. Currently it is not used
        self.ftu.enter_email_address("testuser@mozilla.com")
        self.ftu.tap_next_to_finish_section()

        # Skip the tour
        self.ftu.tap_skip_tour()

        # Switch back to top level now that FTU app is gone
        self.wait_for_condition(lambda m: self.apps.displayed_app.name == Homescreen.name)
