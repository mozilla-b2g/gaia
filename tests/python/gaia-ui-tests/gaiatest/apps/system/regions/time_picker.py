# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time

from marionette_driver import expected, By, Wait
from marionette_driver.marionette import Actions

from gaiatest.apps.base import Base


class TimePicker(Base):

    _time_picker_locator = (By.CLASS_NAME, 'value-selector-time-picker')
    _done_button_locator = (By.CSS_SELECTOR, '.value-selector-time-picker-buttons > button.value-selector-confirm')
    _hour_picker_locator = (By.CLASS_NAME, 'value-picker-hours')
    _minutes_picker_locator = (By.CLASS_NAME, 'value-picker-minutes')
    _hour24_picker_locator = (By.CLASS_NAME, 'value-picker-hour24-state')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        self.marionette.switch_to_frame()
        Wait(self.marionette).until(expected.element_displayed(*self._hour_picker_locator))

        # TODO: wait for the time picker to fade in Bug 1038186
        time.sleep(2)

    def tap_done(self):
        time_picker = self.marionette.find_element(*self._time_picker_locator)
        self.marionette.find_element(*self._done_button_locator).tap()
        Wait(self.marionette).until(expected.element_not_displayed(time_picker))
        # TODO: wait for the time picker to fade out Bug 1038186
        time.sleep(2)
        self.apps.switch_to_displayed_app()

    @property
    def hour(self):
        return self._current(self._hour_picker_locator).text

    @property
    def minute(self):
        return self._current(self._minutes_picker_locator).text

    def add_minute(self):
        current = self._current(self._minutes_picker_locator)
        minute = current.text
        next = current.find_element(By.XPATH, 'following-sibling::*')
        # TODO: Bug 1129907 - Unable to use precise actions to select timepicker values in Gaia
        # TODO: Bug 1031456 - invoking js event without release() loses context
        Actions(self.marionette).press(next).move(current).perform()
        Wait(self.marionette).until(lambda m: self.minute != minute)

    @property
    def hour24(self):
        return self._current(self._hour24_picker_locator).text

    def _current(self, locator):
        picker = self.marionette.find_element(*locator)
        return picker.find_element(By.CLASS_NAME, 'selected')
