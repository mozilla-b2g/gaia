# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time

from marionette.by import By
from marionette.marionette import Actions

from gaiatest.apps.base import Base


class TimePicker(Base):

    _time_picker_locator = (By.CLASS_NAME, 'value-selector-time-picker')
    _done_button_locator = (By.CSS_SELECTOR,
                            '.value-selector-time-picker-buttons > button.value-selector-confirm')

    _hour_picker_locator = (By.CSS_SELECTOR, '.value-picker-hours > div')
    _minutes_picker_locator = (By.CSS_SELECTOR, '.value-picker-minutes > div')
    _hour24_picker_locator = (By.CSS_SELECTOR, '.value-picker-hour24-state > div')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        self.marionette.switch_to_frame()
        self.wait_for_element_displayed(*self._current_element(*self._hour_picker_locator))

        # TODO: wait for the time piker to fade in Bug 1038186
        time.sleep(2)

    def tap_done(self):
        self.marionette.find_element(*self._done_button_locator).tap()
        self.wait_for_element_not_displayed(*self._time_picker_locator)
        # TODO: wait for the time piker to fade out Bug 1038186
        time.sleep(2)
        self.apps.switch_to_displayed_app()

    @property
    def hour(self):
        return self.marionette.find_element(*self._current_element(*self._hour_picker_locator)).text

    @property
    def minute(self):
        return self.marionette.find_element(*self._current_element(*self._minutes_picker_locator)).text

    def spin_minute(self):
        old_minute = self.minute
        self._flick_menu_up(self._minutes_picker_locator)
        self.wait_for_condition(lambda m: self.minute != old_minute)

    @property
    def hour24(self):
        return self.marionette.find_element(*self._current_element(*self._hour24_picker_locator)).text

    def _flick_menu_up(self, locator):
        current_element = self.marionette.find_element(*self._current_element(*locator))

        current_element_move_y = current_element.size['height'] * 7
        current_element_mid_x = current_element.size['width'] / 2
        current_element_mid_y = current_element.size['height'] / 2
        # TODO: update this with more accurate Actions
        Actions(self.marionette).flick(current_element, current_element_mid_x, current_element_mid_y,
                                       current_element_mid_x, current_element_mid_y - current_element_move_y).perform()

    def _current_element(self, method, target):
        return (method, '%s.picker-unit.selected' % target)

    def _next_element(self, method, target):
        return (method, '%s.picker-unit.selected + div' % target)
