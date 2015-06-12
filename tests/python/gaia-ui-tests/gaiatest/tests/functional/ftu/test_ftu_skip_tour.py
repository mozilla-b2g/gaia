# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import By, Wait
from marionette_driver.errors import StaleElementException

from gaiatest import GaiaTestCase
from gaiatest.apps.ftu.app import Ftu
from gaiatest.apps.homescreen.app import Homescreen


class TestFtu(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

        # Reset timezone.user-selected setting as we change this in our testvars
        self.data_layer.set_setting('time.timezone.user-selected', None)

        self.ftu = Ftu(self.marionette)
        self.ftu.launch()

        # If mozWifiManager is not initialised an exception may be thrown
        Wait(self.marionette).until(lambda m: self.data_layer.is_wifi_enabled)

    def test_ftu_skip_tour(self):
        """
        https://moztrap.mozilla.org/manage/case/6119/
        """
        ssid = self.testvars['wifi']['ssid']
        psk = self.testvars['wifi'].get('psk')
        keymanagement = self.testvars['wifi'].get('keyManagement')
        share_data_default = True

        # Assume a SIM is present if we assigned a phone number
        # Don't trust internal API for this, since it's an external condition
        has_a_sim = bool(self.testvars['local_phone_numbers'])

        self.wait_for_condition(lambda m: self.ftu.languages_list > 0, message="No languages listed on screen")

        # select en-US due to the condition of this test is only for en-US
        self.ftu.tap_language("en-US")

        # If a SIM is present, the cell data screen comes up
        if has_a_sim:
            self.ftu.tap_next_to_cell_data_section()
            # Tap enable data if connection is also present. You might have
            # a SIM, but without a valid connection.
            if self.device.has_mobile_connection:
                self.ftu.enable_data()
                self.wait_for_condition(
                    lambda m: self.data_layer.is_cell_data_connected,
                    message='Cell data was not connected by FTU app')

        # Tap next
        self.ftu.tap_next_to_wifi_section()
        self.ftu.wait_for_networks_available()
        self.ftu.connect_to_wifi(ssid, psk, keymanagement)
        Wait(self.marionette, timeout=60, ignored_exceptions=StaleElementException).until(
            lambda m: 'connected' in m.find_element(
                By.CSS_SELECTOR,
                '#networks-list li[data-ssid="%s"] aside' %
                self.testvars['wifi']['ssid']).get_attribute('class'))

        self.assertTrue(self.data_layer.is_wifi_connected(self.testvars['wifi']),
                        "WiFi was not connected via FTU app")

        self.apps.switch_to_displayed_app()

        # Set timezone if there's no connection
        if not self.device.has_mobile_connection:
            self.ftu.tap_next_to_timezone_section()
            # UTC-05:00 America/New York is the default info if no network is detected
            self.assertEqual(self.ftu.timezone_title, "UTC-05:00 America/New York")
            self.ftu.set_timezone_continent("Asia")
            self.ftu.set_timezone_city("Almaty")
            self.assertEqual(self.ftu.timezone_title, "UTC+06:00 Asia/Almaty")

        # Verify Geolocation section appears
        self.ftu.tap_next_to_geolocation_section()

        # Disable geolocation
        self.ftu.disable_geolocation()
        self.wait_for_condition(
            lambda m: not self.data_layer.get_setting('geolocation.enabled'),
            message='Geolocation was not disabled by the FTU app')
        self.ftu.tap_next_to_import_contacts_section()

        # If there's a SIM, try importing from it
        if has_a_sim:
            # You can do this as many times as you like without db conflict
            self.ftu.tap_import_from_sim()
            self.ftu.wait_for_contacts_imported()
            self.assertEqual(self.ftu.count_imported_contacts, len(self.data_layer.all_contacts))

            # all_contacts switches to top frame; Marionette needs to be switched back to ftu
            self.apps.switch_to_displayed_app()

        self.ftu.tap_next_to_firefox_accounts_section()
        self.ftu.tap_next_to_welcome_browser_section()

        # Verify the "Share Data" option matches expected initial state
        # There's a very small lag on this after the dialog appears.
        Wait(self.marionette).until(
            lambda m: self.ftu.is_share_data_enabled == share_data_default,
            message="Send Data UI state should match initial internal state")

        # Verify that internal state matches UI state
        self.assertEqual(self.data_layer.get_setting(
            'debug.performance_data.shared'), self.ftu.is_share_data_enabled,
            msg='Send Data internal state should match UI state')

        # Toggle "Share Data" and verify that it also toggled internal state
        self.ftu.toggle_share_data()
        self.assertEqual(self.data_layer.get_setting(
            'debug.performance_data.shared'), not share_data_default,
            msg='Send Data internal state should be changed by UI')

        self.ftu.tap_next_to_privacy_browser_section()

        # Enter a dummy email address and check it set inside the os
        # TODO assert that this is preserved in the system somewhere. Currently it is not used
        self.ftu.enter_email_address("testuser@mozilla.com")
        self.ftu.tap_next_to_finish_section()

        # Skip the tour
        self.ftu.tap_skip_tour()

        # Switch back to top level now that FTU app is gone
        self.wait_for_condition(lambda m: self.apps.displayed_app.name == Homescreen.name)
