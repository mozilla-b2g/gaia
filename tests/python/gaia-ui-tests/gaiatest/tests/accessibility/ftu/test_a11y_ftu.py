# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import By, Wait
from marionette_driver.errors import StaleElementException

from gaiatest import GaiaTestCase
from gaiatest.apps.ftu.app import Ftu
from gaiatest.apps.homescreen.app import Homescreen


class TestFtuAccessibility(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.data_layer.set_setting('devtools.qps.enabled', True)
        self.ftu = Ftu(self.marionette)
        self.ftu.launch()

        Wait(self.marionette).until(lambda m: self.data_layer.is_wifi_enabled)

    def test_a11y_ftu(self):

        ssid = self.testvars['wifi']['ssid']
        psk = self.testvars['wifi'].get('psk')
        keymanagement = self.testvars['wifi'].get('keyManagement')

        self.wait_for_condition(lambda m: self.ftu.languages_list > 0,
                                message='No languages listed on screen')

        # Select different languages
        self.assertEqual(self.ftu.selected_language, 'en-US')
        self.ftu.a11y_click_language('qps-ploc')
        self.assertEqual(self.ftu.selected_language, 'qps-ploc')
        self.ftu.a11y_click_language('qps-plocm')
        self.assertEqual(self.ftu.selected_language, 'qps-plocm')
        self.ftu.a11y_click_language('en-US')
        self.assertEqual(self.ftu.selected_language, 'en-US')

        self.ftu.a11y_click_next_to_cell_data_section()
        # Enable data
        # TODO: this needs to be enabled when bug 1014887 lands.
        # self.ftu.a11y_enable_data()
        # self.wait_for_condition(
        #     lambda m: self.data_layer.is_cell_data_connected,
        #     message='Cell data was not connected by FTU app')

        self.ftu.a11y_click_next_to_wifi_section()
        # Wait for networks
        self.ftu.wait_for_networks_available()
        # Connect to Wifi
        self.ftu.a11y_connect_to_wifi(ssid, psk, keymanagement)
        Wait(self.marionette, timeout=60, ignored_exceptions=StaleElementException).until(
            lambda m: 'connected' in m.find_element(
                By.CSS_SELECTOR,
                '#networks-list li[data-ssid="%s"] aside' %
                self.testvars['wifi']['ssid']).get_attribute('class'))
        self.assertTrue(self.data_layer.is_wifi_connected(self.testvars['wifi']),
                        'WiFi was not connected via FTU app')

        self.apps.switch_to_displayed_app()

        self.ftu.a11y_click_next_to_timezone_section()
        # Select time zone.
        self.ftu.a11y_set_timezone_continent('Asia')
        self.ftu.a11y_set_timezone_city('Almaty')
        self.assertEqual(self.ftu.timezone_title, 'UTC+06:00 Asia/Almaty')

        self.ftu.a11y_click_next_to_geolocation_section()
        # Disable geolocation
        # TODO: this needs to be enabled when bug 1014887 lands.
        # self.ftu.a11y_disable_geolocation()
        # self.wait_for_condition(lambda m: not self.data_layer.get_setting('geolocation.enabled'),
        #                         message='Geolocation was not disabled by the FTU app')

        self.ftu.a11y_click_next_to_import_contacts_section()
        self.ftu.a11y_click_next_to_firefox_accounts_section()
        self.ftu.a11y_click_next_to_welcome_browser_section()

        # Tap the statistics box and check that it sets a setting
        self.ftu.a11y_click_statistics_checkbox()
        self.wait_for_condition(
            lambda m: self.data_layer.get_setting('debug.performance_data.shared'),
            message='Share performance data was not set')
        self.ftu.a11y_click_statistics_checkbox()
        self.wait_for_condition(
            lambda m: not self.data_layer.get_setting('debug.performance_data.shared'),
            message='Share performance data was not unset')

        self.ftu.a11y_click_next_to_privacy_browser_section()
        self.ftu.a11y_click_next_to_finish_section()

        # Skip the tour
        self.ftu.a11y_click_skip_tour()

        # Switch back to top level now that FTU app is gone
        self.wait_for_condition(lambda m: self.apps.displayed_app.name == Homescreen.name)
