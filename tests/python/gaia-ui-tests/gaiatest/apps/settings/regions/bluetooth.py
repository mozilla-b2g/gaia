# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait
from gaiatest.apps.base import PageRegion
from gaiatest.form_controls.binarycontrol import GaiaBinaryControl


class Bluetooth(PageRegion):

    _root_locator = (By.ID, 'bluetooth_v2')
    _bluetooth_checkbox_locator = (By.CSS_SELECTOR, '.bluetooth-status gaia-switch')
    _bluetooth_label_locator = (By.CSS_SELECTOR, '[data-l10n-id="bluetooth"]')

    _visible_to_all_checkbox_locator = (By.CSS_SELECTOR, '.device-visible gaia-switch')
    _visible_to_all_label_locator = (By.CSS_SELECTOR, '[data-l10n-id="bluetooth-visible-to-all"]')

    _device_name_locator = (By.CSS_SELECTOR, '.bluetooth-device-name')
    _rename_my_device_button_locator = (By.CSS_SELECTOR, 'button.rename-device')
    _update_device_name_input_locator = (By.CSS_SELECTOR, 'input.settings-dialog-input')
    _update_device_name_ok_locator = (By.CSS_SELECTOR, 'button[data-l10n-id="ok"]')

    def __init__(self, marionette):
        root = marionette.find_element(*self._root_locator)
        PageRegion.__init__(self, marionette, root)
        Wait(self.marionette).until(expected.element_displayed(*self._bluetooth_label_locator))

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
        element.tap()
        Wait(self.marionette).until(expected.element_not_displayed(element))
