# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.base import Base


class Bluetooth(Base):

    _bluetooth_checkbox_locator = (By.CSS_SELECTOR, '#bluetooth-status input')
    _bluetooth_label_locator = (By.CSS_SELECTOR, '#bluetooth-status span')

    _visible_to_all_checkbox_locator = (By.CSS_SELECTOR, '#device-visible input')
    _visible_to_all_label_locator = (By.CSS_SELECTOR, '#device-visible span')

    _rename_my_device_button_locator = (By.ID, 'rename-device')
    _update_device_name_form_locator = (By.ID, 'update-device-name')
    _update_device_name_input_locator = (By.ID, 'update-device-name-input')
    _update_device_name_ok_locator = (By.ID, 'update-device-name-confirm')

    @property
    def is_bluetooth_enabled(self):
        return self.marionette.find_element(*self._bluetooth_checkbox_locator).get_attribute('checked')

    @property
    def is_visible_enabled(self):
        return self.marionette.find_element(*self._visible_to_all_checkbox_locator).get_attribute('checked')

    def enable_bluetooth(self):
        self.marionette.find_element(*self._bluetooth_label_locator).tap()
        self.wait_for_condition(lambda m: self.is_bluetooth_enabled == 'true')
        self.wait_for_condition(lambda m: m.find_element(*self._rename_my_device_button_locator).is_enabled())

    def enable_visible_to_all(self):
        if self.is_visible_enabled != 'true':
            # Bluetooth state is stored outside the profile bug 969310
            self.marionette.find_element(*self._visible_to_all_label_locator).tap()
            self.wait_for_condition(lambda m: self.is_visible_enabled == 'true')

    def tap_rename_my_device(self):
        self.marionette.find_element(*self._rename_my_device_button_locator).tap()
        self.wait_for_element_displayed(*self._update_device_name_form_locator)

    def type_phone_name(self, name):
        phone_name = self.marionette.find_element(*self._update_device_name_input_locator)
        phone_name.clear()
        phone_name.send_keys(name)

    def tap_update_device_name_ok(self):
        self.marionette.find_element(*self._update_device_name_ok_locator).tap()
        self.wait_for_element_not_displayed(*self._update_device_name_form_locator)
