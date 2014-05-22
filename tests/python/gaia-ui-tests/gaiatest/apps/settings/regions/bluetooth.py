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

    _paired_devices_locator = (By.CSS_SELECTOR, "#bluetooth-paired-devices a")
    _connected_devices_locator = (By.CSS_SELECTOR, "#bluetooth-paired-devices "
                                                   "small[data-l10n-id='device-status-connected-phone'] ~ a")
    _unpair_button_locator = (By.ID, 'unpair-option')
    _disconnect_button_locator = (By.ID, 'disconnect-option')

    @property
    def is_bluetooth_enabled(self):
        return self.marionette.find_element(*self._bluetooth_checkbox_locator).get_attribute('checked') == 'true'

    @property
    def is_bluetooth_button_greyed_out(self):
        return not self.marionette.find_element(*self._bluetooth_checkbox_locator).is_enabled()

    @property
    def is_visible_enabled(self):
        return self.marionette.find_element(*self._visible_to_all_checkbox_locator).get_attribute('checked') == 'true'

    def enable_bluetooth(self):
        if self.is_bluetooth_enabled is False:
            self.marionette.find_element(*self._bluetooth_label_locator).tap()
            self.wait_for_condition(lambda m: self.is_bluetooth_enabled)
            self.wait_for_condition(lambda m: m.find_element(*self._rename_my_device_button_locator).is_enabled())

    def disable_bluetooth(self):
        if self.is_bluetooth_enabled is True:
            self.marionette.find_element(*self._bluetooth_label_locator).tap()
            self.wait_for_condition(lambda m: not self.is_bluetooth_enabled)
            self.wait_for_condition(lambda m: not self.is_bluetooth_button_greyed_out)

    def enable_visible_to_all(self):
        if self.is_visible_enabled is False:
            # Bluetooth state is stored outside the profile bug 969310
            self.marionette.find_element(*self._visible_to_all_label_locator).tap()
            self.wait_for_condition(lambda m: self.is_visible_enabled)

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

    @property
    def connected_devices(self):
        return [device.text for device in self.marionette.find_elements(*self._connected_devices_locator)]

    @property
    def paired_devices(self):
        return [device.text for device in self.marionette.find_elements(*self._paired_devices_locator)]

    def pair_device(self, device_name):
        self.wait_for_element_present(*self._unpaired_device_locator(device_name)).tap()
        self.wait_for_element_present(*self._connected_device_locator(device_name))

    def disconnect_device(self, device_name):
        self.wait_for_element_present(*self._paired_device_locator(device_name)).tap()
        self.wait_for_element_present(*self._disconnect_button_locator).tap()

    def unpair_device(self, device_name):
        self.wait_for_element_present(*self._paired_device_locator(device_name)).tap()
        self.wait_for_element_present(*self._unpair_button_locator).tap()

    def unpair_all_devices(self):
        for paired_device in self.paired_devices:
            if paired_device in self.connected_devices:
                self.disconnect_device(paired_device)
            self.unpair_device(paired_device)

    @classmethod
    def _unpaired_device_locator(cls, device_name):
        return (By.XPATH, "//*[@id='bluetooth-devices']//a[.='%s']" % device_name)

    @classmethod
    def _paired_device_locator(cls, device_name):
        return (By.XPATH, "//*[@id='bluetooth-paired-devices']//a[.='%s']" % device_name)

    @classmethod
    def _connected_device_locator(cls, device_name):
        return (By.XPATH, "%s/preceding-sibling::small[@data-l10n-id='device-status-connected-phone']"
                          % cls._paired_device_locator(device_name)[1])
