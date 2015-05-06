# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time

from marionette_driver import expected, By, Wait
from gaiatest.apps.cost_control.app import CostControl


class FTUStep3(CostControl):

    _view_locator = (By.ID, 'non-vivo-step-2')
    _data_alert_switch_locator = (By.CSS_SELECTOR, '#non-vivo-step-2 label.end input')
    _data_alert_label_locator = (By.CSS_SELECTOR, '#non-vivo-step-2 label.end')
    _data_alert_selector_locator = (By.CSS_SELECTOR, '#non-vivo-step-2 button[data-widget-type="data-limit"] .tag')

    # Data limit popup for changing limit volume and unit
    _data_limit_view_locator = (By.ID, 'data-limit-dialog')
    _data_limit_dialog_input_locator = (By.ID, 'data-limit-input')
    _data_limit_dialog_done_locator = (By.ID, 'data-usage-done-button')
    _data_limit_switch_unit_locator = (By.CSS_SELECTOR, '#data-limit-dialog .switch-unit-button')

    _go_button_locator = (By.CSS_SELECTOR, '#non-vivo-step-2 button.recommend')

    def __init__(self, marionette):
        CostControl.__init__(self, marionette)
        view = self.marionette.find_element(*self._view_locator)
        Wait(self.marionette).until(lambda m: view.location['x'] == 0)

    def enable_data_alert_toggle(self):
        switch = self.marionette.find_element(*self._data_alert_switch_locator)
        if not switch.is_selected():
            self.marionette.find_element(*self._data_alert_label_locator).tap()
        # Wait for Usage section to hide/display as required
        Wait(self.marionette).until(expected.element_displayed(
            Wait(self.marionette).until(expected.element_present(
                *self._data_alert_selector_locator))))

    def select_when_use_is_above_unit_and_value(self, unit, value):
        self.marionette.find_element(*self._data_alert_selector_locator).tap()

        data_limit_view = self.marionette.find_element(
            *self._data_limit_view_locator)
        Wait(self.marionette).until(lambda m: data_limit_view.location['y'] == 0)

        current_unit = Wait(self.marionette).until(
            expected.element_present(*self._data_limit_switch_unit_locator))
        Wait(self.marionette).until(expected.element_displayed(current_unit))

        if current_unit.text != unit:
            current_unit.tap()
            Wait(self.marionette).until(lambda m: current_unit.text == unit)

        # clear the original assigned value and set it to the new value
        self.marionette.find_element(*self._data_limit_dialog_input_locator).clear()
        self.keyboard.send(value)
        self.switch_to_ftu()
        self.marionette.find_element(*self._data_limit_dialog_done_locator).tap()

        data_limit_view = self.marionette.find_element(
            *self._data_limit_view_locator)
        Wait(self.marionette).until(lambda m: int(data_limit_view.location['y']) == int(data_limit_view.size['height']))

    def tap_lets_go(self):
        self.marionette.find_element(*self._go_button_locator).tap()
        self.apps.switch_to_displayed_app()
        self.wait_for_element_not_displayed(*self._ftu_frame_locator)

        # TODO Some wait for Usage to fully initialize
        time.sleep(2)
