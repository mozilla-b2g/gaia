# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

try:
    from marionette import (expected,
                            Wait)
    from marionette.by import By
except:
    from marionette_driver import (expected,
                                   Wait)
    from marionette_driver.by import By
from gaiatest.apps.base import Base


class Settings(Base):

    _settings_iframe_locator = (By.ID, 'settings-view-placeholder')
    _settings_title_locator = (By.CSS_SELECTOR, 'section#settings-view h1')

    _data_alert_label_locator = (By.XPATH, "//ul[preceding-sibling::gaia-subheader[@id='data-usage-settings']]/li[2]/label")
    _data_alert_switch_locator = (By.CSS_SELECTOR, 'input[data-option="dataLimit"]')
    _when_use_is_above_button_locator = (By.CSS_SELECTOR, 'button[data-widget-type="data-limit"]')
    _unit_button_locator = (By.CSS_SELECTOR, '#data-limit-dialog form button')
    _size_input_locator = (By.CSS_SELECTOR, '#data-limit-dialog form input')
    _usage_done_button_locator = (By.ID, 'data-usage-done-button')

    _reset_button_locator = (By.ID, 'reset-data-usage')
    _reset_dialog_locator = (By.ID, 'reset-data-dialog')
    _reset_wifi_usage_button_locator = (By.ID, 'reset-wifi-data-usage')
    _reset_mobile_usage_button_locator = (By.ID, 'reset-mobile-data-usage')
    _done_button_locator = (By.ID, 'close-settings')
    _confirm_reset_button_locator = (By.CSS_SELECTOR, '#reset-dialog button.danger')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        # go into iframe of usage app settings
        frame = Wait(self.marionette).until(expected.element_present(
            *self._settings_iframe_locator))
        Wait(self.marionette).until(expected.element_displayed(frame))
        self.marionette.switch_to_frame(frame)

        Wait(self.marionette).until(expected.element_displayed(
            Wait(self.marionette).until(expected.element_present(
                *self._settings_title_locator))))

    def toggle_data_alert_switch(self, value):
        switch = self.marionette.find_element(*self._data_alert_switch_locator)
        if switch.is_selected() != value:
            self.marionette.find_element(*self._data_alert_label_locator).tap()

    def select_when_use_is_above_unit_and_value(self, unit, value):
        when_use_is_above_button = self.marionette.find_element(*self._when_use_is_above_button_locator)
        Wait(self.marionette).until(lambda m: when_use_is_above_button.get_attribute('disabled') == 'false')
        when_use_is_above_button.tap()

        current_unit = Wait(self.marionette).until(
            expected.element_present(*self._unit_button_locator))
        Wait(self.marionette).until(expected.element_displayed(current_unit))
        if current_unit.text != unit:
            current_unit.tap()
            # We need to wait for the javascript to do its stuff
            Wait(self.marionette).until(lambda m: current_unit.text == unit)

        # clear the original assigned value and set it to the new value
        size = Wait(self.marionette).until(expected.element_present(*self._size_input_locator))
        Wait(self.marionette).until(expected.element_displayed(size))
        size.clear()
        size.send_keys(value)
        self.marionette.find_element(*self._usage_done_button_locator).tap()

    def reset_wifi_usage(self):
        self.marionette.find_element(*self._reset_button_locator).tap()

        reset_wifi_usage = Wait(self.marionette).until(
            expected.element_present(*self._reset_wifi_usage_button_locator))
        Wait(self.marionette).until(expected.element_displayed(reset_wifi_usage))
        reset_dialog = self.marionette.find_element(*self._reset_dialog_locator)
        reset_wifi_usage.tap()

        confirm_reset_button = Wait(self.marionette).until(
            expected.element_present(*self._confirm_reset_button_locator))
        Wait(self.marionette).until(expected.element_displayed(confirm_reset_button))
        confirm_reset_button.tap()

        Wait(self.marionette).until(expected.element_not_displayed(reset_dialog))

    def reset_mobile_usage(self):
        self.marionette.find_element(*self._reset_button_locator).tap()
        reset_mobile_usage = Wait(self.marionette).until(
            expected.element_present(*self._reset_mobile_usage_button_locator))
        Wait(self.marionette).until(expected.element_displayed(reset_mobile_usage))
        reset_dialog = self.marionette.find_element(*self._reset_dialog_locator)
        reset_mobile_usage.tap()

        confirm_reset_button = Wait(self.marionette).until(
            expected.element_present(*self._confirm_reset_button_locator))
        Wait(self.marionette).until(expected.element_displayed(confirm_reset_button))
        confirm_reset_button.tap()

        Wait(self.marionette).until(expected.element_not_displayed(reset_dialog))

    def tap_done(self):
        done_button = Wait(self.marionette).until(
            expected.element_present(*self._done_button_locator))
        Wait(self.marionette).until(expected.element_displayed(done_button))
        done_button.tap()
        # Switch back to Cost Control app frame
        self.apps.switch_to_displayed_app()
