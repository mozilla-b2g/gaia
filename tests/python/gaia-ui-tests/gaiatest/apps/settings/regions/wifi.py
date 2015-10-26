# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait
from marionette_driver.errors import StaleElementException
from gaiatest.apps.base import Base
from gaiatest.form_controls.binarycontrol import GaiaBinaryControl


class Wifi(Base):

    _screen_locator = (By.ID, 'wifi')
    _wifi_enabled_checkbox_locator = (By.CSS_SELECTOR, '.wifi-enabled gaia-switch')
    _available_networks_locator = (By.CSS_SELECTOR, '.wifi-availableNetworks > li > aside[class*="wifi-signal"]')
    _password_input_locator = (By.CSS_SELECTOR, '#wifi-auth input[type="password"]')
    _password_ok_button_locator = (By.CSS_SELECTOR, '#wifi-auth button[type="submit"]')
    _connected_message_locator = (By.CSS_SELECTOR, '.wifi-availableNetworks li.active small')
    _wps_connect_locator = (By.CSS_SELECTOR, '[data-l10n-id="wpsMessage"]')

    _wps_screen_locator = (By.ID, 'wifi-wps')
    _wps_selection_locator = (By.CSS_SELECTOR, '[data-l10n-id="wpsMethodSelection"]')
    _manage_networks_locator = (By.CSS_SELECTOR, '[data-l10n-id="manageNetworks"]')
    _manage_networks_screen_locator = (By.ID, 'wifi-manageNetworks')

    _join_hidden_screen_locator = (By.ID, 'wifi-joinHidden')
    _join_hidden_network_locator = (By.CSS_SELECTOR, '[data-l10n-id="joinHiddenNetwork"]')
    _security_selector_locator = (By.NAME, 'security')
    _security_selector_ok_btn_locator = (By.CLASS_NAME, 'value-option-confirm')
    _manage_certs_locator = (By.CSS_SELECTOR, '[data-l10n-id="manageCertificates"]')

    _manage_certs_screen_locator = (By.ID, 'wifi-manageCertificates')
    _import_certs_locator = (By.CSS_SELECTOR, '[data-l10n-id="importCertificate"]')
    _select_certs_screen_locator = (By.ID, 'wifi-selectCertificateFile')
    _active_wifi_locator = (By.CSS_SELECTOR, '.wifi-availableNetworks li.active')
    _forget_locator = (By.CSS_SELECTOR, '#wifi-status span[data-l10n-id="forget"]')

    @property
    def screen_element(self):
        return self.marionette.find_element(*self._screen_locator)

    @property
    def wps_screen_element(self):
        return self.marionette.find_element(*self._wps_screen_locator)

    @property
    def manage_network_screen_element(self):
        return self.marionette.find_element(*self._manage_networks_screen_locator)

    @property
    def join_hidden_network_screen_element(self):
        return self.marionette.find_element(*self._join_hidden_screen_locator)

    @property
    def manage_certs_screen_element(self):
        return self.marionette.find_element(*self._manage_certs_screen_locator)

    @property
    def select_certs_screen_element(self):
        return self.marionette.find_element(*self._select_certs_screen_locator)

    @property
    def is_wifi_enabled(self):
        return self._wifi_switch.is_checked

    @property
    def manage_network_button(self):
        return self.marionette.find_element(*self._manage_networks_locator)

    def enable_wifi(self):
        self._wifi_switch.enable()

    @property
    def _wifi_switch(self):
        return GaiaBinaryControl(self.marionette, self._wifi_enabled_checkbox_locator)

    def disable_wifi(self):
        self._wifi_switch.disable()

    def connect_to_network(self, network_info):

        # Wait for the networks to be found
        this_network_locator = ('xpath', "//li/a/span[text()='%s']" % network_info['ssid'])
        this_network = Wait(self.marionette).until(expected.element_present(*this_network_locator))
        this_network.tap()

        if network_info.get('keyManagement'):
            password = network_info.get('psk') or network_info.get('wep')
            if not password:
                raise Exception('No psk or wep key found in testvars for secured wifi network.')

            screen_width = int(self.marionette.execute_script('return window.innerWidth'))
            ok_button = self.marionette.find_element(*self._password_ok_button_locator)
            Wait(self.marionette).until(lambda m: (ok_button.location['x'] + ok_button.size['width']) == screen_width)
            password_input = self.marionette.find_element(*self._password_input_locator)
            Wait(self.marionette).until(expected.element_displayed(password_input))
            password_input.send_keys(password)
            ok_button.tap()

        connected_message = self.marionette.find_element(*self._connected_message_locator)
        self.marionette.execute_script("arguments[0].scrollIntoView(false);", [connected_message])
        timeout = max(self.marionette.timeout and self.marionette.timeout / 1000, 60)
        Wait(self.marionette, timeout, ignored_exceptions=StaleElementException).until(
            lambda m: m.find_element(*self._connected_message_locator).text == "Connected")

    def tap_connect_with_wps(self):
        element = self.marionette.find_element(*self._wps_connect_locator)
        Wait(self.marionette).until(expected.element_displayed(element))
        element.tap()
        Wait(self.marionette).until(expected.element_displayed(*self._wps_selection_locator))

    def tap_manage_networks(self):
        element = self.marionette.find_element(*self._manage_networks_locator)
        Wait(self.marionette).until(expected.element_displayed(element))
        element.tap()
        Wait(self.marionette).until(expected.element_displayed(*self._join_hidden_network_locator))

    def tap_join_hidden_network(self):
        element = self.marionette.find_element(*self._join_hidden_network_locator)
        Wait(self.marionette).until(expected.element_displayed(element))
        element.tap()
        Wait(self.marionette).until(expected.element_displayed(*self._security_selector_locator))

    def tap_security_selector(self):
        element = self.marionette.find_element(*self._security_selector_locator)
        Wait(self.marionette).until(expected.element_displayed(element))
        element.tap()
        self.marionette.switch_to_frame()
        Wait(self.marionette).until(expected.element_displayed(*self._security_selector_ok_btn_locator))

    def tap_security_ok(self):
        element = self.marionette.find_element(*self._security_selector_ok_btn_locator)
        Wait(self.marionette).until(expected.element_displayed(element))
        element.tap()
        self.apps.switch_to_displayed_app()
        Wait(self.marionette).until(expected.element_displayed(*self._security_selector_locator))

    def tap_manage_certs(self):
        element = self.marionette.find_element(*self._manage_certs_locator)
        Wait(self.marionette).until(expected.element_displayed(element))
        element.tap()
        Wait(self.marionette).until(expected.element_displayed(*self._import_certs_locator))

    def tap_import_certs(self):
        element = self.marionette.find_element(*self._import_certs_locator)
        Wait(self.marionette).until(expected.element_displayed(element))
        element.tap()
        Wait(self.marionette).until(expected.element_displayed(*self._select_certs_screen_locator))
    
    def tap_active_wifi(self):
        element = self.marionette.find_element(*self._active_wifi_locator)
        element.tap()
        Wait(self.marionette).until(expected.element_displayed(*self._forget_locator))

    def tap_forget_wifi(self):
        element_to_forget = Wait(self.marionette).until(expected.element_present(*self._forget_locator))
        Wait(self.marionette).until(expected.element_displayed(element_to_forget))
        element_to_forget.tap()
        Wait(self.marionette).until(expected.element_not_displayed(element_to_forget))
