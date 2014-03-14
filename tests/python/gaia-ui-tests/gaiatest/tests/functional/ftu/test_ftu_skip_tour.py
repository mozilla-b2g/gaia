# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import re

from marionette.by import By

from gaiatest import GaiaTestCase


class TestFtu(GaiaTestCase):

    _activation_section_locator = (By.ID, 'activation')
    _main_title_locator = (By.ID, 'main_title')

    _next_button_locator = (By.ID, 'forward')

    # Step Languages section
    _section_languages_locator = (By.ID, 'languages')
    _listed_languages_locator = (By.CSS_SELECTOR, "#languages ul li input[name='language.current']")

    # Step Cell data section
    _section_cell_data_locator = (By.ID, 'data_3g')
    _enable_data_checkbox_locator = (By.CSS_SELECTOR, '#data_3g .pack-end')

    # Step Wifi
    _section_wifi_locator = (By.ID, 'wifi')
    _found_wifi_networks_locator = (By.CSS_SELECTOR, 'ul#networks-list li')
    _network_state_locator = (By.XPATH, 'p[2]')
    _password_input_locator = (By.ID, 'wifi_password')
    _join_network_locator = (By.ID, 'wifi-join-button')

    # Step Date & Time
    _section_date_time_locator = (By.ID, 'date_and_time')
    _timezone_continent_locator = (By.CSS_SELECTOR, '#time-form li:nth-child(1) > .change.icon.icon-dialog')
    _timezone_city_locator = (By.CSS_SELECTOR, '#time-form li:nth-child(2) > .change.icon.icon-dialog')
    _time_zone_title_locator = (By.ID, 'time-zone-title')

    # Step Geolocation
    _section_geolocation_locator = (By.ID, 'geolocation')
    _enable_geolocation_checkbox_locator = (By.CSS_SELECTOR, '#geolocation .pack-end label')

    # Section Import contacts
    _section_import_contacts_locator = (By.ID, 'import_contacts')
    _import_from_sim_locator = (By.ID, 'sim-import-button')
    _sim_import_feedback_locator = (By.CSS_SELECTOR, '.ftu p')

    # Section About Your rights
    _section_ayr_locator = (By.ID, 'about-your-rights')

    # Section Welcome Browser
    _section_welcome_browser_locator = (By.ID, 'welcome_browser')
    _enable_statistic_checkbox_locator = (By.ID, 'form_share_statistics')

    # Section Privacy Choices
    _section_browser_privacy_locator = (By.ID, 'browser_privacy')
    _email_field_locator = (By.CSS_SELECTOR, 'input[type="email"]')

    # Section Finish
    _section_finish_locator = (By.ID, 'finish-screen')
    _skip_tour_button_locator = (By.ID, 'skip-tutorial-button')
    _take_tour_button_locator = (By.ID, 'lets-go-button')

    # Section Tour
    _step1_header_locator = (By.ID, 'step1Header')
    _step2_header_locator = (By.ID, 'step2Header')
    _step3_header_locator = (By.ID, 'step3Header')
    _step4_header_locator = (By.ID, 'step4Header')
    _step5_header_locator = (By.ID, 'step5Header')
    _tour_next_button_locator = (By.ID, 'forward-tutorial')
    _tour_back_button_locator = (By.ID, 'back-tutorial')

    # Section Tutorial Finish
    _section_tutorial_finish_locator = (By.CSS_SELECTOR, '.tutorial-finish-base')
    _lets_go_button_locator = (By.ID, 'tutorialFinished')

    # Pattern for import sim contacts message
    _pattern_contacts = re.compile("^No contacts detected on SIM to import$|^Imported one contact$|^Imported [0-9]+ contacts$")
    _pattern_contacts_0 = re.compile("^No contacts detected on SIM to import$")
    _pattern_contacts_1 = re.compile("^Imported one contact$")
    _pattern_contacts_N = re.compile("^Imported ([0-9]+) contacts$")

    def setUp(self):
        GaiaTestCase.setUp(self)

        # launch the First Time User app
        self.app = self.apps.launch('FTU')

        self.wait_for_condition(lambda m: self.data_layer.is_wifi_enabled)

    def create_language_locator(self, language):
        return (By.CSS_SELECTOR, "#languages ul li input[name='language.current'][value='%s'] ~ p" % language)

    def test_ftu_skip_tour(self):
        # https://moztrap.mozilla.org/manage/case/3876/
        # 3876, 3879

        self.wait_for_element_displayed(*self._section_languages_locator)

        listed_languages = self.marionette.find_elements(*self._listed_languages_locator)
        self.assertGreater(len(listed_languages), 0, "No languages listed on screen")

        # select en-US due to the condition of this test is only for en-US
        language_item = self.marionette.find_element(*self.create_language_locator("en-US"))
        language_item.tap()

        # Tap next
        self.wait_for_element_displayed(*self._next_button_locator)
        self.marionette.find_element(*self._next_button_locator).tap()
        self.wait_for_element_displayed(*self._section_cell_data_locator)

        # Tap enable data
        self.marionette.find_element(*self._enable_data_checkbox_locator).tap()

        self.wait_for_condition(lambda m: self.data_layer.is_cell_data_connected,
                                message="Cell data was not connected by FTU app")

        # Tap next
        self.marionette.find_element(*self._next_button_locator).tap()
        self.wait_for_element_displayed(*self._section_wifi_locator)

        # Wait for the networks to be found
        wifi_network_locator = (By.ID, self.testvars['wifi']['ssid'])
        wifi_network = self.wait_for_element_present(*wifi_network_locator)
        wifi_network.tap()

        # This is in the event we are using a Wifi Network that requires a password
        # We cannot be sure of this thus need the logic
        if self.testvars['wifi'].get('keyManagement'):

            self.wait_for_element_displayed(*self._password_input_locator)
            password = self.marionette.find_element(*self._password_input_locator)
            password.send_keys(self.testvars['wifi'].get('psk') or self.testvars['wifi'].get('wep'))
            self.marionette.find_element(*self._join_network_locator).tap()

        self.wait_for_condition(
            lambda m: 'connected' in m.find_element(
                By.CSS_SELECTOR,
                '#networks-list li[data-ssid="%s"] aside' %
                self.testvars['wifi']['ssid']).get_attribute('class'))

        self.assertTrue(self.data_layer.is_wifi_connected(self.testvars['wifi']),
                        "WiFi was not connected via FTU app")

        # is_wifi_connected() calls switch_to_frame()
        self.marionette.switch_to_frame(self.app.frame)

        # Tap next
        self.marionette.find_element(*self._next_button_locator).tap()
        self.wait_for_element_displayed(*self._section_date_time_locator)

        # Set timezone
        continent_select = self.marionette.find_element(*self._timezone_continent_locator)
        continent_select.tap()
        self._select("Asia")

        city_select = self.marionette.find_element(*self._timezone_city_locator)
        city_select.tap()
        self._select("Almaty")

        self.assertEqual(self.marionette.find_element(*self._time_zone_title_locator).text,
                         "UTC+06:00 Asia/Almaty")

        self.marionette.find_element(*self._next_button_locator).tap()

        # Verify Geolocation section appears
        self.wait_for_element_displayed(*self._section_geolocation_locator)

        # Disable geolocation
        self.wait_for_element_displayed(*self._enable_geolocation_checkbox_locator)
        self.marionette.find_element(*self._enable_geolocation_checkbox_locator).tap()
        self.wait_for_condition(lambda m: not self.data_layer.get_setting('geolocation.enabled'),
                                message="Geolocation was not disabled by the FTU app")
        self.marionette.find_element(*self._next_button_locator).tap()

        self.wait_for_element_displayed(*self._section_import_contacts_locator)

        # Tap import from SIM
        # You can do this as many times as you like without db conflict
        self.marionette.find_element(*self._import_from_sim_locator).tap()

        # pass third condition when contacts are 0~N
        self.wait_for_condition(lambda m: self._pattern_contacts.match(m.find_element(*self._sim_import_feedback_locator).text) is not None,
                                message="Contact did not import from sim before timeout")
        # Find how many contacts are imported.
        import_sim_message = self.marionette.find_element(*self._sim_import_feedback_locator).text
        import_sim_count = None
        if self._pattern_contacts_0.match(import_sim_message) is not None:
            import_sim_count = 0
        elif self._pattern_contacts_1.match(import_sim_message) is not None:
            import_sim_count = 1
        elif self._pattern_contacts_N.match(import_sim_message) is not None:
            count = self._pattern_contacts_N.match(import_sim_message).group(1)
            import_sim_count = int(count)

        self.assertEqual(len(self.data_layer.all_contacts), import_sim_count)

        # all_contacts switches to top frame; Marionette needs to be switched back to ftu
        self.marionette.switch_to_frame(self.app.frame)

        # Tap next
        self.marionette.find_element(*self._next_button_locator).tap()
        self.wait_for_element_displayed(*self._section_welcome_browser_locator)

        # Tap the statistics box and check that it sets a setting
        # TODO assert via settings API that this is set. Currently it is not used
        self.marionette.find_element(*self._enable_statistic_checkbox_locator).tap()

        # Tap next
        self.marionette.find_element(*self._next_button_locator).tap()
        self.wait_for_element_displayed(*self._section_browser_privacy_locator)

        # Enter a dummy email address and check it set inside the os
        # TODO assert that this is preserved in the system somewhere. Currently it is not used
        self.marionette.find_element(*self._email_field_locator).send_keys("testuser@mozilla.com")

        # Tap next
        self.marionette.find_element(*self._next_button_locator).tap()
        self.wait_for_element_displayed(*self._section_finish_locator)

        # Skip the tour
        self.marionette.find_element(*self._skip_tour_button_locator).tap()

        # Switch back to top level now that FTU app is gone
        self.marionette.switch_to_frame()

    def _select(self, match_string):
        # cheeky Select wrapper until Marionette has its own
        # due to the way B2G wraps the app's select box we match on text

        _list_item_locator = (By.XPATH, "id('value-selector-container')/descendant::li[descendant::span[.='%s']]" % match_string)
        _close_button_locator = (By.CSS_SELECTOR, 'button.value-option-confirm')

        # have to go back to top level to get the B2G select box wrapper
        self.marionette.switch_to_frame()

        li = self.wait_for_element_present(*_list_item_locator)

       # TODO Remove scrollintoView upon resolution of bug 877651
        self.marionette.execute_script(
            'arguments[0].scrollIntoView(false);', [li])
        li.tap()

        close_button = self.marionette.find_element(*_close_button_locator)

        # Tap close and wait for it to hide
        close_button.tap()
        self.wait_for_element_not_displayed(*_close_button_locator)

        # now back to app
        self.marionette.switch_to_frame(self.apps.displayed_app.frame)
