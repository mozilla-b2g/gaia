# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import re

from marionette import expected
from marionette import Wait
from marionette.by import By
from marionette.errors import FrameSendFailureError

from gaiatest.apps.base import Base


class Ftu(Base):

    name = 'FTU'

    _back_button_locator = (By.ID, 'back-button')

    # Step Languages section
    _section_languages_locator = (By.ID, 'languages')
    _listed_languages_locator = (By.CSS_SELECTOR, "#languages ul li")
    _language_locator = (By.CSS_SELECTOR, "#languages ul li#%s ~ p")
    _language_input_locator = (By.CSS_SELECTOR,
                               "#languages ul li input[name='language.current'][value='%s']")
    _selected_language_input_locator = (By.CSS_SELECTOR, "#languages ul li input:checked")
    _us_languages_option_locator = (By.ID, 'en-US')

    # Step Cell data section
    _section_cell_data_locator = (By.ID, 'data_3g')
    _enable_data_option_locator = (By.ID, 'enable-data')

    # Step Wifi
    _section_wifi_locator = (By.ID, 'wifi')
    _found_wifi_networks_locator = (By.CSS_SELECTOR, 'ul#networks-list li')
    _password_input_locator = (By.ID, 'wifi_password')
    _join_network_locator = (By.ID, 'wifi-join-button')
    _progress_activity_locator = (By.ID, 'progress-activity')
    _wifi_forward_locator = (By.CSS_SELECTOR, '#wifi .forward');

    # Step Date & Time
    _section_date_time_locator = (By.ID, 'date_and_time')
    _timezone_continent_locator = (By.CSS_SELECTOR, '#time-form li:nth-child(1) > .change.icon.icon-dialog')
    _timezone_city_locator = (By.CSS_SELECTOR, '#time-form li:nth-child(2) > .change.icon.icon-dialog')
    _time_zone_title_locator = (By.ID, 'time-zone-title')
    _timezone_forward_locator = (By.ID, 'dt_skip');

    # Step Geolocation
    _section_geolocation_locator = (By.ID, 'geolocation')
    _geolocation_forward_locator = (By.ID, 'enable-geolocation');

    # Section Import contacts
    _section_import_contacts_locator = (By.ID, 'import_contacts')
    _import_from_sim_locator = (By.ID, 'sim-import-button')
    _sim_import_feedback_locator = (By.ID, 'statusMsg')
    _import_forward_locator = (By.CSS_SELECTOR, '#import_contacts .forward');

    # Step Firefox Accounts
    _section_firefox_accounts_locator = (By.ID, 'firefox_accounts')
    _fxa_forward_locator = (By.ID, 'fxa-no');

    # Section Welcome Browser
    _section_welcome_browser_locator = (By.ID, 'welcome_browser')
    _enable_statistic_checkbox_locator = (By.ID, 'form_share_statistics')
    _welcome_forward_locator = (By.ID, 'share-performance');
    _welcome_forward_noshare_locator = (By.CSS_SELECTOR,
                                        '#welcome_browser li:not(#share-performance).forward');

    # Section Privacy Choices
    _section_browser_privacy_locator = (By.ID, 'browser_privacy')
    _email_field_locator = (By.CSS_SELECTOR, 'input[type="email"]')
    _privacy_forward_locator = (By.CSS_SELECTOR, '#browser_privacy .forward');

    # Section Finish
    _section_finish_locator = (By.ID, 'finish-screen')
    _skip_tour_button_locator = (By.ID, 'skip-tutorial-button')
    _take_tour_button_locator = (By.ID, 'lets-go-button')

    # Section Tour
    _step_header_locator = (By.ID, 'tutorial-step-title')
    _tour_next_button_locator = (By.ID, 'forward-tutorial')
    _tour_back_button_locator = (By.ID, 'back-tutorial')

    # Section Tutorial Finish
    _section_tutorial_finish_locator = (By.ID, 'tutorial-finish-tiny')
    _lets_go_button_locator = (By.ID, 'tutorialFinished')

    # Pattern for import sim contacts message
    _pattern_contacts = re.compile("^No contacts detected on SIM to import$|^Imported one contact$|^Imported [0-9]+ contacts$")
    _pattern_contacts_0 = re.compile("^No contacts detected on SIM to import$")
    _pattern_contacts_1 = re.compile("^Imported one contact$")
    _pattern_contacts_N = re.compile("^Imported ([0-9]+) contacts$")

    def launch(self):
        Base.launch(self)
        Wait(self.marionette).until(expected.element_displayed(
            Wait(self.marionette).until(expected.element_present(
                *self._section_languages_locator))))

    @property
    def languages_list(self):
        return len(self.marionette.find_elements(*self._listed_languages_locator))

    @property
    def selected_language(self):
        return self.marionette.find_element(*self._selected_language_input_locator).get_attribute('value')

    def tap_language(self, language):
        self.marionette.find_element(self._language_locator[0], self._language_locator[1] % language).tap()

    def a11y_click_language(self, language):
        self.accessibility.click(self.marionette.find_element(By.ID, language))

    def tap_next(self):
        #self.marionette.find_element(*self._next_button_locator).tap()
        self.marionette.find_element().tap()

    def a11y_click_next(self):
        self.accessibility.click(self.marionette.find_element(*self._next_button_locator))

    def a11y_click_back(self):
        self.accessibility.click(self.marionette.find_element(*self._back_button_locator))

    def a11y_click(self, method, locator):
        self.accessibility.click(self.marionette.find_element(method, locator))

    def tap_next_to_cell_data_section(self):
        self.tap_next()
        Wait(self.marionette).until(expected.element_displayed(
            Wait(self.marionette).until(expected.element_present(
                *self._section_cell_data_locator))))

    def a11y_click_next_to_cell_data_section(self):
        self.a11y_click_next()
        Wait(self.marionette).until(expected.element_displayed(
            Wait(self.marionette).until(expected.element_present(
                *self._section_cell_data_locator))))

    def enable_data(self):
        checkbox = Wait(self.marionette).until(
            expected.element_present(*self._enable_data_checkbox_locator))
        Wait(self.marionette).until(expected.element_displayed(checkbox))
        checkbox.tap()

    def a11y_enable_data(self):
        checkbox = Wait(self.marionette).until(
            expected.element_present(*self._enable_data_checkbox_locator))
        Wait(self.marionette).until(expected.element_displayed(checkbox))
        self.accessibility.click(checkbox)

    def tap_next_to_wifi_section(self):
        self.marionette.find_element(*self._us_languages_option_locator).tap()
        Wait(self.marionette).until(expected.element_not_displayed(progress))
        Wait(self.marionette).until(expected.element_displayed(
            Wait(self.marionette).until(expected.element_present(
                *self._section_wifi_locator))))

    def a11y_click_next_to_wifi_section(self):
        self.a11y_click(*self._us_languages_option_locator)
        Wait(self.marionette).until(expected.element_not_displayed(progress))
        Wait(self.marionette).until(expected.element_displayed(
            Wait(self.marionette).until(expected.element_present(
                *self._section_wifi_locator))))

    def wait_for_networks_available(self):
        Wait(self.marionette).until(lambda m: len(m.find_elements(
            *self._found_wifi_networks_locator)) > 0,
            message='No networks listed on screen')

    def find_wifi_network(self, network_ssid):
        wifi_network_locator = (By.CSS_SELECTOR, '#networks-list li[data-ssid="%s"]' % network_ssid)
        wifi_network = Wait(self.marionette).until(
            expected.element_present(*wifi_network_locator))
        self.marionette.execute_script("arguments[0].scrollIntoView(false);", [wifi_network])
        return wifi_network

    def connect_to_wifi(self, network_ssid, password, key_management=None):
        wifi_network = self.find_wifi_network(network_ssid)
        wifi_network.tap()

        # This is in the event we are using a Wifi Network that requires a password
        # We cannot be sure of this thus need the logic
        if key_management:
            password_element = Wait(self.marionette).until(
                expected.element_present(*self._password_input_locator))
            Wait(self.marionette).until(expected.element_displayed(password_element))
            password_element.send_keys(password)
            self.marionette.find_element(*self._join_network_locator).tap()

    def a11y_connect_to_wifi(self, network_ssid, password, key_management=None):
        wifi_network = self.find_wifi_network(network_ssid)
        self.accessibility.click(wifi_network)

        # This is in the event we are using a Wifi Network that requires a password
        # We cannot be sure of this thus need the logic
        if key_management:
            password_element = Wait(self.marionette).until(
                expected.element_present(*self._password_input_locator))
            Wait(self.marionette).until(expected.element_displayed(password_element))
            password_element.send_keys(password)
            self.accessibility.click(self.marionette.find_element(*self._join_network_locator))

    def tap_next_to_timezone_section(self):
        self.marionette.find_element(*self._wifi_forward_locator).tap()
        Wait(self.marionette).until(expected.element_displayed(
            Wait(self.marionette).until(expected.element_present(
                *self._section_date_time_locator))))

    def a11y_click_next_to_timezone_section(self):
        self.a11y_click(*self._wifi_forward_locator)
        Wait(self.marionette).until(expected.element_displayed(
            Wait(self.marionette).until(expected.element_present(
                *self._section_date_time_locator))))

    def set_timezone_continent(self, continent):
        element = Wait(self.marionette).until(
            expected.element_present(*self._timezone_continent_locator))
        Wait(self.marionette).until(expected.element_displayed(element))
        element.tap()
        self.select(continent)

    def a11y_set_timezone_continent(self, continent):
        element = Wait(self.marionette).until(
            expected.element_present(*self._timezone_continent_locator))
        Wait(self.marionette).until(expected.element_displayed(element))
        self.accessibility.click(element)
        self.a11y_select(continent)

    def set_timezone_city(self, city):
        element = Wait(self.marionette).until(
            expected.element_present(*self._timezone_city_locator))
        Wait(self.marionette).until(expected.element_displayed(element))
        element.tap()
        self.select(city)

    def a11y_set_timezone_city(self, city):
        element = Wait(self.marionette).until(
            expected.element_present(*self._timezone_city_locator))
        Wait(self.marionette).until(expected.element_displayed(element))
        self.accessibility.click(element)
        self.a11y_select(city)

    @property
    def timezone_title(self):
        return self.marionette.find_element(*self._time_zone_title_locator).text

    def tap_next_to_geolocation_section(self):
        dt_skip = self.wait_for_element_present(*self._timezone_forward_locator)
        self.marionette.execute_script("arguments[0].scrollIntoView(false);",
                                       [dt_skip])
        self.wait_for_element_displayed(*self._timezone_forward_locator)
        dt_skip.tap()
        Wait(self.marionette).until(expected.element_displayed(
            Wait(self.marionette).until(expected.element_present(
                *self._section_geolocation_locator))))

    def a11y_click_next_to_geolocation_section(self):
        self.a11y_click(*self._timezone_forward_locator)
        Wait(self.marionette).until(expected.element_displayed(
            Wait(self.marionette).until(expected.element_present(
                *self._section_geolocation_locator))))

    def disable_geolocation(self):
        element = Wait(self.marionette).until(
            expected.element_present(*self._enable_geolocation_checkbox_locator))
        Wait(self.marionette).until(expected.element_displayed(element))
        # TODO: Remove y parameter when Bug 932804 is fixed
        element.tap(y=30)

    def a11y_disable_geolocation(self):
        element = Wait(self.marionette).until(
            expected.element_present(*self._enable_geolocation_checkbox_locator))
        Wait(self.marionette).until(expected.element_displayed(element))
        self.accessibility.click(element)

    def tap_next_to_import_contacts_section(self):
        self.marionette.find_element(*self._geolocation_forward_locator).tap()
        Wait(self.marionette).until(expected.element_displayed(
            Wait(self.marionette).until(expected.element_present(
                *self._section_import_contacts_locator))))

    def a11y_click_next_to_import_contacts_section(self):
        self.a11y_click(*self._geolocation_forward_locator)
        Wait(self.marionette).until(expected.element_displayed(
            Wait(self.marionette).until(expected.element_present(
                *self._section_import_contacts_locator))))

    def tap_import_from_sim(self):
        self.marionette.find_element(*self._import_from_sim_locator).tap()

    def wait_for_contacts_imported(self):
        feedback = self.marionette.find_element(
            *self._sim_import_feedback_locator)
        Wait(self.marionette).until(
            lambda m: self._pattern_contacts.match(feedback.text) is not None,
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

    def tap_next_to_firefox_accounts_section(self):
        self.marionette.find_element(*self._import_forward_locator).tap()
        Wait(self.marionette).until(expected.element_displayed(
            Wait(self.marionette).until(expected.element_present(
                *self._section_firefox_accounts_locator))))

    def a11y_click_next_to_firefox_accounts_section(self):
        self.a11y_click(*self._import_forward_locator)
        Wait(self.marionette).until(expected.element_displayed(
            Wait(self.marionette).until(expected.element_present(
                *self._section_firefox_accounts_locator))))

    def tap_next_to_welcome_browser_section(self):
        self.marionette.find_element(*self._fxa_forward_locator).tap()
        Wait(self.marionette).until(expected.element_displayed(
            Wait(self.marionette).until(expected.element_present(
                *self._section_welcome_browser_locator))))

    def a11y_click_next_to_welcome_browser_section(self):
        self.a11y_click(*self._fxa_forward_locator)
        Wait(self.marionette).until(expected.element_displayed(
            Wait(self.marionette).until(expected.element_present(
                *self._section_welcome_browser_locator))))

    def tap_statistics_checkbox(self):
        self.marionette.find_element(*self._enable_statistic_checkbox_locator).tap()

    def a11y_click_statistics_checkbox(self):
        self.accessibility.click(self.marionette.find_element(*self._statistic_checkbox_locator))

    def tap_next_to_privacy_browser_section(self):
        self.marionette.find_element(*self._welcome_forward_locator).tap()
        Wait(self.marionette).until(expected.element_displayed(
            Wait(self.marionette).until(expected.element_present(
                *self._section_browser_privacy_locator))))

    def a11y_click_next_to_privacy_browser_section(self):
        self.a11y_click(*self._welcome_forward_locator)
        Wait(self.marionette).until(expected.element_displayed(
            Wait(self.marionette).until(expected.element_present(
                *self._section_browser_privacy_locator))))

    def a11y_click_next_to_privacy_browser_noshare_section(self):
        self.a11y_click(*self._welcome_forward_noshare_locator)
        Wait(self.marionette).until(expected.element_displayed(
            Wait(self.marionette).until(expected.element_present(
                *self._section_browser_privacy_locator))))

    def enter_email_address(self, email):
        # TODO assert that this is preserved in the system somewhere. Currently it is not used
        self.marionette.find_element(*self._email_field_locator).send_keys(email)

    def tap_next_to_finish_section(self):
        self.marionette.find_element(*self._privacy_forward_locator).tap()
        Wait(self.marionette).until(expected.element_displayed(
            Wait(self.marionette).until(expected.element_present(
                *self._section_finish_locator))))

    def a11y_click_next_to_finish_section(self):
        self.a11y_click(*self._privacy_forward_locator)
        Wait(self.marionette).until(expected.element_displayed(
            Wait(self.marionette).until(expected.element_present(
                *self._section_finish_locator))))

    def tap_skip_tour(self):
        try:
            self.marionette.find_element(*self._skip_tour_button_locator).tap()
        except FrameSendFailureError:
            # The frame may close for Marionette but that's expected so we can continue - Bug 1065933
            pass

    def a11y_click_skip_tour(self):
        self.accessibility.click(self.marionette.find_element(*self._skip_tour_button_locator))

    def run_ftu_setup_with_default_values(self):
        self.tap_next_to_wifi_section()
        self.tap_next_to_timezone_section()
        self.tap_next_to_geolocation_section()
        self.tap_next_to_import_contacts_section()
        self.tap_next_to_firefox_accounts_section()
        self.tap_next_to_welcome_browser_section()
        self.tap_next_to_privacy_browser_section()
        self.tap_next_to_finish_section()

    def tap_take_tour(self):
        self.marionette.find_element(*self._take_tour_button_locator).tap()

    @property
    def step1_header_text(self):
        header = Wait(self.marionette).until(
            expected.element_present(*self._step_header_locator))
        Wait(self.marionette).until(expected.element_displayed(header))
        return header.text

    def tap_tour_next(self):
        next = Wait(self.marionette).until(
            expected.element_present(*self._tour_next_button_locator))
        Wait(self.marionette).until(expected.element_displayed(next))
        next.tap()

    def tap_back(self):
        back = Wait(self.marionette).until(
            expected.element_present(*self._tour_back_button_locator))
        Wait(self.marionette).until(expected.element_displayed(back))
        back.tap()

    @property
    def step2_header_text(self):
        header = Wait(self.marionette).until(
            expected.element_present(*self._step_header_locator))
        Wait(self.marionette).until(expected.element_displayed(header))
        return header.text

    @property
    def step3_header_text(self):
        header = Wait(self.marionette).until(
            expected.element_present(*self._step_header_locator))
        Wait(self.marionette).until(expected.element_displayed(header))
        return header.text

    @property
    def step4_header_text(self):
        header = Wait(self.marionette).until(
            expected.element_present(*self._step_header_locator))
        Wait(self.marionette).until(expected.element_displayed(header))
        return header.text

    @property
    def step5_header_text(self):
        header = Wait(self.marionette).until(
            expected.element_present(*self._step_header_locator))
        Wait(self.marionette).until(expected.element_displayed(header))
        return header.text

    @property
    def step6_header_text(self):
        header = Wait(self.marionette).until(
            expected.element_present(*self._step_header_locator))
        Wait(self.marionette).until(expected.element_displayed(header))
        return header.text

    def wait_for_finish_tutorial_section(self):
        Wait(self.marionette).until(expected.element_displayed(
            Wait(self.marionette).until(expected.element_present(
                *self._section_tutorial_finish_locator))))

    def tap_lets_go_button(self):
        try:
            self.marionette.find_element(*self._lets_go_button_locator).tap()
        except FrameSendFailureError:
            # The frame may close for Marionette but that's expected so we can continue - Bug 1065933
            pass
