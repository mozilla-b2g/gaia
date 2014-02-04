# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time

from marionette.by import By
from gaiatest.apps.cost_control.app import CostControl


class FTUStep3(CostControl):

    _view_locator = (By.ID, 'non-vivo-step-2')
    _ftu_usage_locator = (By.CSS_SELECTOR, '#non-vivo-step-2 span.tag')
    _ftu_data_alert_switch_locator = (By.CSS_SELECTOR, '#non-vivo-step-2 label.end input')
    _ftu_data_alert_label_locator = (By.CSS_SELECTOR, '#non-vivo-step-2 label.end')
    _size_input_locator = (By.CSS_SELECTOR, '#data-limit-dialog form input')
    _usage_done_button_locator = (By.ID, 'data-usage-done-button')
    _go_button_locator = (By.CSS_SELECTOR, '#non-vivo-step-2 button.recommend')

    _data_limit_view_locator = (By.ID, 'data-limit-dialog')
    _switch_unit_button_locator = (By.CSS_SELECTOR, '#data-limit-dialog .switch-unit-button')

    def __init__(self, marionette):
        CostControl.__init__(self, marionette)
        view = self.marionette.find_element(*self._view_locator)
        self.wait_for_condition(lambda m: view.location['x'] == 0)

    def toggle_data_alert_switch(self, value):
        self.wait_for_element_displayed(*self._ftu_data_alert_label_locator)
        switch = self.marionette.find_element(*self._ftu_data_alert_switch_locator)
        if switch.is_selected() is not value:
            label = self.marionette.find_element(*self._ftu_data_alert_label_locator)
            label.tap()

    def select_when_use_is_above_unit_and_value(self, unit, value):
        self.wait_for_element_displayed(*self._ftu_usage_locator)
        self.marionette.find_element(*self._ftu_usage_locator).tap()

        data_limit_view = self.marionette.find_element(
            *self._data_limit_view_locator)
        self.wait_for_condition(lambda m: data_limit_view.location['y'] == 0)
        self.wait_for_condition(lambda m: self.keyboard.is_displayed())
        self.switch_to_ftu()
        self.wait_for_element_displayed(*self._switch_unit_button_locator)

        current_unit = self.marionette.find_element(*self._switch_unit_button_locator)
        if current_unit.text != unit:
            current_unit.tap()
            self.wait_for_condition(lambda m: current_unit.text == unit)

        # clear the original assigned value and set it to the new value
        self.wait_for_element_displayed(*self._size_input_locator)
        self.marionette.find_element(*self._size_input_locator).clear()
        self.keyboard.send(value)
        self.switch_to_ftu()
        self.marionette.find_element(*self._usage_done_button_locator).tap()

        data_limit_view = self.marionette.find_element(
            *self._data_limit_view_locator)
        self.wait_for_condition(lambda m: data_limit_view.location['y'] == data_limit_view.size['height'])

    def tap_lets_go(self):
        self.wait_for_element_displayed(*self._go_button_locator)
        self.marionette.find_element(*self._go_button_locator).tap()
        self.apps.switch_to_displayed_app()
        self.wait_for_element_not_displayed(*self._ftu_frame_locator)

        # TODO Some wait for Usage to fully initialize
        time.sleep(2)
