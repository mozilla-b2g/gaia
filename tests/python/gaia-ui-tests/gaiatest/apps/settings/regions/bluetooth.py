# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait
from gaiatest.apps.base import PageRegion
from gaiatest.form_controls.binarycontrol import GaiaBinaryControl


class Bluetooth(PageRegion):

    _root_locator = (By.ID, 'bluetooth')

    _bluetooth_checkbox_locator = (By.CSS_SELECTOR,
                                   '#bluetooth .bluetooth-status gaia-switch')
    _bluetooth_label_locator = (By.CSS_SELECTOR, '[data-l10n-id="bluetooth"]')

    _visible_to_all_checkbox_locator = (By.CSS_SELECTOR,
                                        '#bluetooth .device-visible gaia-switch')
    _visible_to_all_label_locator = (By.CSS_SELECTOR, '[data-l10n-id="bluetooth-visible-to-all"]')

    _device_name_locator = (By.CSS_SELECTOR, '.bluetooth-device-name')
    _rename_my_device_button_locator = (By.CSS_SELECTOR, 'button.rename-device')
    _update_device_name_input_locator = (By.CSS_SELECTOR, 'input.settings-dialog-input')
    _update_device_name_ok_locator = (By.CSS_SELECTOR, '#settings-prompt-dialog .recommend')
    _search_for_devices_locator = (By.CSS_SELECTOR, 'button.search-device')
    _device_list_locator = (By.CLASS_NAME, "bluetooth-device")
    _bt_device_name_locator = (By.CSS_SELECTOR, "bdi")
    _confirm_dialog_locator = (By.ID, 'settings-confirm-dialog')
    _confirm_button_locator = (By.CLASS_NAME, 'danger')

    def __init__(self, marionette):
        root = marionette.find_element(*self._root_locator)
        PageRegion.__init__(self, marionette, root)
        Wait(self.marionette).until(expected.element_displayed(*self._bluetooth_label_locator))

    @property
    def screen_element(self):
        return self.root_element

    @property
    def is_bluetooth_enabled(self):
        return self._bluetooth_switch.is_checked

    def enable_bluetooth(self):
        self._bluetooth_switch.enable()
        rename_device = self.root_element.find_element(*self._rename_my_device_button_locator)
        Wait(self.marionette).until(expected.element_enabled(rename_device))

    @property
    def _bluetooth_switch(self):
        return GaiaBinaryControl(self.marionette, self._bluetooth_checkbox_locator)

    @property
    def is_visible_enabled(self):
        return self._is_visible_switch.is_checked

    def enable_visible_to_all(self):
        self._is_visible_switch.enable()

    @property
    def _is_visible_switch(self):
        return GaiaBinaryControl(self.marionette, self._visible_to_all_checkbox_locator)

    @property
    def device_name(self):
        return self.root_element.find_element(*self._device_name_locator).text

    #  workaround for bug 1202246.  Need to call this method after frame switching
    def refresh_root_element(self):
        self.root_element = self.marionette.find_element(*self._root_locator)

    def disable_bluetooth(self):
        self._bluetooth_switch.disable()

    def tap_rename_my_device(self):
        self.root_element.find_element(*self._rename_my_device_button_locator).tap()
        Wait(self.marionette).until(
            expected.element_displayed(*self._update_device_name_input_locator))

    def type_phone_name(self, name):
        element = self.marionette.find_element(*self._update_device_name_input_locator)
        element.clear()
        element.send_keys(name)

    def tap_update_device_name_ok(self):
        element = self.marionette.find_element(*self._update_device_name_ok_locator)
        Wait(self.marionette).until(expected.element_displayed(element))
        element.tap()
        Wait(self.marionette).until(expected.element_not_displayed(element))

    def tap_search_for_devices(self):
        element = self.root_element.find_element(*self._search_for_devices_locator)
        element.tap()
        Wait(self.marionette).until(expected.element_not_enabled(element))
        Wait(self.marionette).until(expected.element_enabled(element))

    def tap_device(self, name):
        elements = self.root_element.find_elements(*self._device_list_locator)
        for element in elements:
            child = element.find_element(*self._bt_device_name_locator)
            if child.text == name:
                child.tap()
                return True
        return False

    def tap_confirm_unpair_device(self):
        confirm_dialog = self.marionette.find_element(*self._confirm_dialog_locator)
        confirm_dialog.find_element(*self._confirm_button_locator).tap()
