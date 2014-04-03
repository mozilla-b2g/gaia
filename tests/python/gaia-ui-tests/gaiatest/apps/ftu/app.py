# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import re
from marionette.by import By

from gaiatest.apps.base import Base


class Ftu(Base):

    name = 'FTU'

    _next_button_locator = (By.ID, 'forward')

    # Step Languages section
    _section_languages_locator = (By.ID, 'languages')
    _listed_languages_locator = (By.CSS_SELECTOR, "#languages ul li input[name='language.current']")
    _language_locator = (By.CSS_SELECTOR, "#languages ul li input[name='language.current'][value='%s'] ~ p")

    # Step Cell data section
    _section_cell_data_locator = (By.ID, 'data_3g')
    _enable_data_checkbox_locator = (By.CSS_SELECTOR, '#data_3g .pack-end')

    # Step Wifi
    _section_wifi_locator = (By.ID, 'wifi')
    _found_wifi_networks_locator = (By.CSS_SELECTOR, 'ul#networks-list li')
    _password_input_locator = (By.ID, 'wifi_password')
    _join_network_locator = (By.ID, 'wifi-join-button')
    _progress_activity_locator = (By.ID, 'progress-activity')

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
    _sim_import_feedback_locator = (By.ID, 'statusMsg')

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

    def launch(self):
        Base.launch(self)
        self.wait_for_element_displayed(*self._section_languages_locator)

    @property
    def languages_list(self):
        return len(self.marionette.find_elements(*self._listed_languages_locator))

    def tap_language(self, language):
        self.marionette.find_element(self._language_locator[0], self._language_locator[1] % language).tap()

    def tap_next(self):
        self.marionette.find_element(*self._next_button_locator).tap()

    def tap_next_to_cell_data_section(self):
        self.tap_next()
        self.wait_for_element_displayed(*self._section_cell_data_locator)

    def enable_data(self):
        self.wait_for_element_displayed(*self._enable_data_checkbox_locator)
        self.marionette.find_element(*self._enable_data_checkbox_locator).tap()

    def tap_next_to_wifi_section(self):
        self.tap_next()
        self.wait_for_condition(lambda m: not self.is_element_displayed(*self._progress_activity_locator))
        self.wait_for_element_displayed(*self._section_wifi_locator)

    def wait_for_networks_available(self):
        self.wait_for_condition(lambda m: len(m.find_elements(*self._found_wifi_networks_locator)) > 0, message='No networks listed on screen')

    def connect_to_wifi(self, network_ssid, password, key_management=None):
        wifi_network_locator = (By.CSS_SELECTOR, '#networks-list li[data-ssid="%s"]' % network_ssid)
        wifi_network = self.wait_for_element_present(*wifi_network_locator)
        self.marionette.execute_script("arguments[0].scrollIntoView(false);", [wifi_network])
        wifi_network.tap()

        # This is in the event we are using a Wifi Network that requires a password
        # We cannot be sure of this thus need the logic
        if key_management:
            self.wait_for_element_displayed(*self._password_input_locator)
            self.marionette.find_element(*self._password_input_locator).send_keys(password)
            self.marionette.find_element(*self._join_network_locator).tap()

    def tap_next_to_timezone_section(self):
        self.tap_next()
        self.wait_for_element_displayed(*self._section_date_time_locator)

    def set_timezone_continent(self, continent):
        self.wait_for_element_displayed(*self._timezone_continent_locator)
        self.marionette.find_element(*self._timezone_continent_locator).tap()
        self.select(continent)

    def set_timezone_city(self, city):
        self.wait_for_element_displayed(*self._timezone_city_locator)
        self.marionette.find_element(*self._timezone_city_locator).tap()
        self.select(city)

    @property
    def timezone_title(self):
        return self.marionette.find_element(*self._time_zone_title_locator).text

    def tap_next_to_geolocation_section(self):
        self.tap_next()
        self.wait_for_element_displayed(*self._section_geolocation_locator)

    def disable_geolocation(self):
        self.wait_for_element_displayed(*self._enable_geolocation_checkbox_locator)
        self.marionette.find_element(*self._enable_geolocation_checkbox_locator).tap()

    def tap_next_to_import_contacts_section(self):
        self.tap_next()
        self.wait_for_element_displayed(*self._section_import_contacts_locator)

    def tap_import_from_sim(self):
        self.marionette.find_element(*self._import_from_sim_locator).tap()

    def wait_for_contacts_imported(self):
        self.wait_for_condition(lambda m: self._pattern_contacts.match(m.find_element(*self._sim_import_feedback_locator).text) is not None,
                                message='Contact did not import from sim before timeout')

    @property
    def count_imported_contacts(self):
        import_sim_message = self.marionette.find_element(*self._sim_import_feedback_locator).text
        import_sim_count = None
        if self._pattern_contacts_0.match(import_sim_message) is not None:
            import_sim_count = 0
        elif self._pattern_contacts_1.match(import_sim_message) is not None:
            import_sim_count = 1
        elif self._pattern_contacts_N.match(import_sim_message) is not None:
            count = self._pattern_contacts_N.match(import_sim_message).group(1)
            import_sim_count = int(count)
        return import_sim_count

    def tap_next_to_welcome_browser_section(self):
        self.tap_next()
        self.wait_for_element_displayed(*self._section_welcome_browser_locator)

    def tap_statistics_checkbox(self):
        self.marionette.find_element(*self._enable_statistic_checkbox_locator).tap()

    def tap_next_to_privacy_browser_section(self):
        self.tap_next()
        self.wait_for_element_displayed(*self._section_browser_privacy_locator)

    def enter_email_address(self, email):
        # TODO assert that this is preserved in the system somewhere. Currently it is not used
        self.marionette.find_element(*self._email_field_locator).send_keys(email)

    def tap_next_to_finish_section(self):
        self.tap_next()
        self.wait_for_element_displayed(*self._section_finish_locator)

    def tap_skip_tour(self):
        self.marionette.find_element(*self._skip_tour_button_locator).tap()

    def run_ftu_setup_with_default_values(self):
        count =0
        while not self.is_element_displayed(*self._take_tour_button_locator):
            if self.is_element_displayed(*self._next_button_locator):
                self.tap_next()
            else:
                count=count+1
            if count > 5:
                break

    def tap_take_tour(self):
        self.marionette.find_element(*self._take_tour_button_locator).tap()

    @property
    def step1_header_text(self):
        self.wait_for_element_displayed(*self._step1_header_locator)
        return self.marionette.find_element(*self._step1_header_locator).text

    def tap_tour_next(self):
        self.wait_for_element_displayed(*self._tour_next_button_locator)
        self.marionette.find_element(*self._tour_next_button_locator).tap()

    def tap_back(self):
        self.wait_for_element_displayed(*self._tour_next_button_locator)
        self.marionette.find_element(*self._tour_back_button_locator).tap()

    @property
    def step2_header_text(self):
        self.wait_for_element_displayed(*self._step2_header_locator)
        return self.marionette.find_element(*self._step2_header_locator).text

    @property
    def step3_header_text(self):
        self.wait_for_element_displayed(*self._step3_header_locator)
        return self.marionette.find_element(*self._step3_header_locator).text

    @property
    def step4_header_text(self):
        self.wait_for_element_displayed(*self._step4_header_locator)
        return self.marionette.find_element(*self._step4_header_locator).text

    @property
    def step5_header_text(self):
        self.wait_for_element_displayed(*self._step5_header_locator)
        return self.marionette.find_element(*self._step5_header_locator).text

    def wait_for_finish_tutorial_section(self):
        self.wait_for_element_displayed(*self._section_tutorial_finish_locator)

    def tap_lets_go_button(self):
        self.marionette.find_element(*self._lets_go_button_locator).tap()
