# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import By, expected, Wait

from gaiatest.apps.base import Base


class SimSettings(Base):

    _page_locator = (By.ID, 'carrier-detail')

    _network_op_locator = (By.CSS_SELECTOR, '[data-l10n-id ="networkOperator"]')
    _network_op_page_locator = (By.ID, 'operator-settings')
    _network_type_selector_locator = (By.CSS_SELECTOR, '.preferred-network-type .button')
    _network_type_confirm_button_locator = (By.CLASS_NAME, 'value-option-confirm')

    _apn_settings_locator = (By.CSS_SELECTOR, '[data-l10n-id ="apnSettings"]')
    _apn_settings_page_locator = (By.ID, 'apn-settings')
    _data_settings_page_locator = (By.ID, 'apn-list')
    _data_settings_locator = (By.CSS_SELECTOR, '[data-l10n-id ="dataSettings"]')
    _add_new_apn_btn_locator = (By.CLASS_NAME, 'add-apn')

    _apn_editor_page_locator = (By.ID, 'apn-editor')
    _authentication_selector_locator = (By.CLASS_NAME, 'authtype')
    _protocol_selector_locator = (By.CLASS_NAME, 'protocol')
    _roaming_protocol_locator = (By.CLASS_NAME, 'roaming_protocol')
    _apn_selector_confirm_button_locator = (By.CLASS_NAME, 'value-option-confirm')

    _reset_apn_btn_locator = (By.CSS_SELECTOR, '[data-l10n-id ="reset-apn"]')
    _cancel_btn_locator = (By.CSS_SELECTOR, '.reset-apn-warning .cancel-btn')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        element = self.marionette.find_element(*self._page_locator)
        Wait(self.marionette).until(lambda m: 'current' in element.get_attribute('class'))

    @property
    def screen_element(self):
        return self.marionette.find_element(*self._page_locator)

    @property
    def network_op_screen_element(self):
        return self.marionette.find_element(*self._network_op_page_locator)

    @property
    def apn_settings_screen_element(self):
        return self.marionette.find_element(*self._apn_settings_page_locator)

    @property
    def data_settings_screen_element(self):
        return self.marionette.find_element(*self._data_settings_page_locator)

    @property
    def apn_editor_screen_element(self):
        return self.marionette.find_element(*self._apn_editor_page_locator)

    def tap_network_operator(self):
        element = self.marionette.find_element(*self._network_op_locator)
        Wait(self.marionette).until(expected.element_displayed(element) and expected.element_enabled(element))
        element.tap()
        Wait(self.marionette).until(expected.element_displayed(*self._network_type_selector_locator))

    def tap_network_type(self):
        element = self.marionette.find_element(*self._network_type_selector_locator)
        Wait(self.marionette).until(expected.element_displayed(element) and expected.element_enabled(element))
        element.tap()
        self.marionette.switch_to_frame()
        Wait(self.marionette).until(expected.element_displayed(*self._network_type_confirm_button_locator))

    def confirm_network_type(self):
        element = self.marionette.find_element(*self._network_type_confirm_button_locator)
        Wait(self.marionette).until(expected.element_displayed(element) and expected.element_enabled(element))
        element.tap()
        self.apps.switch_to_displayed_app()
        Wait(self.marionette).until(expected.element_displayed(*self._network_type_selector_locator))

    def tap_apn_settings(self):
        element = self.marionette.find_element(*self._apn_settings_locator)
        Wait(self.marionette).until(expected.element_displayed(element) and expected.element_enabled(element))
        element.tap()
        Wait(self.marionette).until(expected.element_displayed(*self._reset_apn_btn_locator))

    def tap_data_settings(self):
        element = self.marionette.find_element(*self._data_settings_locator)
        Wait(self.marionette).until(expected.element_displayed(element) and expected.element_enabled(element))
        element.tap()
        Wait(self.marionette).until(expected.element_displayed(*self._add_new_apn_btn_locator))

    def tap_add_new_apn(self):
        element = self.marionette.find_element(*self._add_new_apn_btn_locator)
        Wait(self.marionette).until(expected.element_displayed(element) and expected.element_enabled(element))
        element.tap()
        Wait(self.marionette).until(expected.element_displayed(*self._apn_editor_page_locator))

    def select_authentication(self):
        element = self.marionette.find_element(*self._authentication_selector_locator)
        Wait(self.marionette).until(expected.element_displayed(element) and expected.element_enabled(element))
        element.tap()
        self.marionette.switch_to_frame()
        Wait(self.marionette).until(expected.element_displayed(*self._apn_selector_confirm_button_locator))

    def select_protocol(self):
        element = self.marionette.find_element(*self._protocol_selector_locator)
        Wait(self.marionette).until(expected.element_displayed(element) and expected.element_enabled(element))
        element.tap()
        self.marionette.switch_to_frame()
        Wait(self.marionette).until(expected.element_displayed(*self._apn_selector_confirm_button_locator))

    def select_roaming_protocol(self):
        element = self.marionette.find_element(*self._roaming_protocol_locator)
        Wait(self.marionette).until(expected.element_displayed(element) and expected.element_enabled(element))
        element.tap()
        self.marionette.switch_to_frame()
        Wait(self.marionette).until(expected.element_displayed(*self._apn_selector_confirm_button_locator))

    def confirm_apn_selection(self):
        element = self.marionette.find_element(*self._apn_selector_confirm_button_locator)
        Wait(self.marionette).until(expected.element_displayed(element) and expected.element_enabled(element))
        element.tap()
        self.apps.switch_to_displayed_app()
        Wait(self.marionette).until(expected.element_displayed(*self._apn_editor_page_locator))

    def tap_reset_to_default(self):
        element = self.marionette.find_element(*self._reset_apn_btn_locator)
        Wait(self.marionette).until(expected.element_displayed(element) and expected.element_enabled(element))
        element.tap()
        Wait(self.marionette).until(expected.element_displayed(*self._cancel_btn_locator))

    def tap_cancel_reset(self):
        element = self.marionette.find_element(*self._cancel_btn_locator)
        Wait(self.marionette).until(expected.element_displayed(element) and expected.element_enabled(element))
        element.tap()
        Wait(self.marionette).until(expected.element_displayed(*self._reset_apn_btn_locator))
