# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.base import Base


class Wifi(Base):

    _wifi_enabled_label_locator = (By.CSS_SELECTOR, '#wifi-enabled label')
    _wifi_enabled_checkbox_locator = (By.CSS_SELECTOR, '#wifi-enabled input')
    _available_networks_locator = (By.CSS_SELECTOR, '#wifi-availableNetworks > li > aside[class*="wifi-signal"]')
    _password_input_locator = (By.CSS_SELECTOR, '#wifi-auth input[type="password"]')
    _password_ok_button_locator = (By.CSS_SELECTOR, '#wifi-auth button[type="submit"]')
    _connected_message_locator = (By.CSS_SELECTOR, '#wifi-availableNetworks li.active small')

    @property
    def is_wifi_enabled(self):
        return self.marionette.find_element(*self._wifi_enabled_checkbox_locator).get_attribute('checked')

    def enable_wifi(self):
        self.marionette.find_element(*self._wifi_enabled_label_locator).tap()
        self.wait_for_condition(lambda m: self.is_wifi_enabled)

    def connect_to_network(self, network_info):
        # Wait for some networks to be found
        self.wait_for_condition(lambda m: len(m.find_elements(*self._available_networks_locator)) > 0,
                                message="No networks listed on screen")

        this_network_locator = ('xpath', "//li/a[text()='%s']" % network_info['ssid'])
        self.marionette.find_element(*this_network_locator).tap()

        if network_info.get('keyManagement'):
            password = network_info.get('psk') or network_info.get('wep')
            if not password:
                raise Exception('No psk or wep key found in testvars for secured wifi network.')

            self.wait_for_element_displayed(*self._password_input_locator)
            password_input = self.marionette.find_element(*self._password_input_locator)
            password_input.send_keys(password)
            self.marionette.find_element(*self._password_ok_button_locator).tap()

        self.wait_for_condition(
            lambda m: m.find_element(*self._connected_message_locator).text == "Connected",
                        timeout = max(self.marionette.timeout and self.marionette.timeout / 1000, 60))
