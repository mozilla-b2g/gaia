# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base


class Bluetooth(Base):

    _bluetooth_checkbox_locator = (By.CSS_SELECTOR, '#bluetooth_v2 .bluetooth-status input')
    _bluetooth_label_locator = (By.CSS_SELECTOR, '#bluetooth_v2 .bluetooth-status span')

    _visible_to_all_checkbox_locator = (By.CSS_SELECTOR, '#bluetooth_v2 .device-visible input')
    _visible_to_all_label_locator = (By.CSS_SELECTOR, '#bluetooth_v2 .device-visible label')

    _device_name_locator = (By.CSS_SELECTOR, '.bluetooth-device-name')
    _rename_my_device_button_locator = (By.CSS_SELECTOR, 'button.rename-device')
    _update_device_name_input_locator = (By.CSS_SELECTOR, 'input.settings-dialog-input')
    _update_device_name_ok_locator = (By.CSS_SELECTOR, 'button[data-l10n-id="ok"]')

    @property
    def is_bluetooth_enabled(self):
        return self.marionette.find_element(*self._bluetooth_checkbox_locator).is_selected()

    @property
    def is_visible_enabled(self):
        return self.marionette.find_element(*self._visible_to_all_checkbox_locator).is_selected()

    @property
    def device_name(self):
        return self.marionette.find_element(*self._device_name_locator).text

    def enable_bluetooth(self):
        self.marionette.find_element(*self._bluetooth_label_locator).tap()
        checkbox = self.marionette.find_element(*self._bluetooth_checkbox_locator)
        Wait(self.marionette).until(expected.element_selected(checkbox))
        rename_device = self.marionette.find_element(*self._rename_my_device_button_locator)
        Wait(self.marionette).until(expected.element_enabled(rename_device))

    def enable_visible_to_all(self):
        # Bluetooth state is stored outside the profile bug 969310
        self.marionette.find_element(*self._visible_to_all_label_locator).tap()
        checkbox = self.marionette.find_element(*self._visible_to_all_checkbox_locator)
        Wait(self.marionette).until(expected.element_selected(checkbox))

    def tap_rename_my_device(self):
        self.marionette.find_element(*self._rename_my_device_button_locator).tap()
        Wait(self.marionette).until(
            expected.element_displayed(*self._update_device_name_input_locator))

    def type_phone_name(self, name):
        element = self.marionette.find_element(
            *self._update_device_name_input_locator)
        element.clear()
        element.send_keys(name)

    def tap_update_device_name_ok(self):
        element = self.marionette.find_element(*self._update_device_name_ok_locator)
        element.tap()
        Wait(self.marionette).until(expected.element_not_displayed(element))
