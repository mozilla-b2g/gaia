# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import PageRegion


class Bluetooth(PageRegion):

    _root_locator = (By.ID, 'bluetooth_v2')

    _bluetooth_checkbox_locator = (By.CSS_SELECTOR,
                                   '#bluetooth_v2 .bluetooth-status gaia-switch')
    _bluetooth_label_locator = (By.CSS_SELECTOR, '[data-l10n-id="bluetooth"]')

    _visible_to_all_checkbox_locator = (By.CSS_SELECTOR,
                                        '#bluetooth_v2 .device-visible gaia-switch')
    _visible_to_all_label_locator = (By.CSS_SELECTOR, '[data-l10n-id="bluetooth-visible-to-all"]')

    _device_name_locator = (By.CSS_SELECTOR, '.bluetooth-device-name')
    _rename_my_device_button_locator = (By.CSS_SELECTOR, 'button.rename-device')
    _update_device_name_input_locator = (By.CSS_SELECTOR, 'input.settings-dialog-input')
    _update_device_name_ok_locator = (By.CSS_SELECTOR, '#settings-prompt-dialog .recommend')

    def __init__(self, marionette):
        root = marionette.find_element(*self._root_locator)
        PageRegion.__init__(self, marionette, root)
        Wait(self.marionette).until(expected.element_displayed(*self._bluetooth_label_locator))

    @property
    def screen_element(self):
        return self.root_element

    @property
    def is_bluetooth_enabled(self):
        return self.root_element.find_element(*self._bluetooth_checkbox_locator).is_selected()

    @property
    def is_visible_enabled(self):
        return self.root_element.find_element(
            *self._visible_to_all_checkbox_locator).is_selected()

    @property
    def device_name(self):
        return self.root_element.find_element(*self._device_name_locator).text

    #  workaround for bug 1202246.  Need to call this method after frame switching
    def refresh_root_element(self):
        self.root_element = self.marionette.find_element(*self._root_locator)

    def enable_bluetooth(self):
        self.root_element.find_element(*self._bluetooth_label_locator).tap()
        checkbox = self.root_element.find_element(*self._bluetooth_checkbox_locator)
        Wait(self.marionette).until(lambda m: self.is_custom_element_checked(checkbox))
        rename_device = self.root_element.find_element(*self._rename_my_device_button_locator)
        Wait(self.marionette).until(expected.element_enabled(rename_device))

    def disable_bluetooth(self):
        Wait(self.marionette).until(expected.element_enabled(
            self.marionette.find_element(*self._rename_my_device_button_locator)))
        self.root_element.find_element(*self._bluetooth_label_locator).tap()
        checkbox = self.root_element.find_element(*self._bluetooth_checkbox_locator)
        Wait(self.marionette).until(lambda m: not self.is_custom_element_checked(checkbox))

    def enable_visible_to_all(self):
        self.root_element.find_element(*self._visible_to_all_label_locator).tap()
        checkbox = self.marionette.find_element(*self._visible_to_all_checkbox_locator)
        Wait(self.marionette).until(lambda m: self.is_custom_element_checked(checkbox))

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
