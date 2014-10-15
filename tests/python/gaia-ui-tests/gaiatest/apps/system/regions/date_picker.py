# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time

from marionette.by import By
from marionette.marionette import Actions

from gaiatest.apps.base import Base


class DatePicker(Base):

    _spindate_picker_locator = (By.CLASS_NAME, 'value-selector-spin-date-picker')
    _done_button_locator = (By.CSS_SELECTOR,
                          '.value-selector-spin-date-picker-buttons > button.value-option-confirm')

    _month_picker_locator = (By.CSS_SELECTOR, '.value-picker-month > div')
    _date_picker_locator = (By.CSS_SELECTOR, '.value-picker-date > div')
    _year_picker_locator = (By.CSS_SELECTOR, '.value-picker-year > div')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        self.marionette.switch_to_frame()
        self.wait_for_element_displayed(*self._current_element(*self._month_picker_locator))

        # TODO: wait for the time piker to fade in Bug 1038186
        time.sleep(2)

    def tap_done(self):
        self.marionette.find_element(*self._done_button_locator).tap()
        self.wait_for_element_not_displayed(*self._spindate_picker_locator)
        # TODO: wait for the time piker to fade out Bug 1038186
        time.sleep(2)
        self.apps.switch_to_displayed_app()

    @property
    def month(self):
        return self.marionette.find_element(*self._current_element(*self._month_picker_locator)).text

    def spin_month(self,direction):
        old_month = self.month
        if direction == 'down':  #decrement the month
            self._flick_menu_down(self._month_picker_locator)
        else:
            self._flick_menu_up(self._month_picker_locator)
        self.wait_for_condition(lambda m: self.month != old_month)

    @property
    def date(self):
        return self.marionette.find_element(*self._current_element(*self._date_picker_locator)).text

    def spin_date(self, direction):
        old_date = self.date
        if direction == 'down':  #decrement the month
            self._flick_menu_down(self._date_picker_locator)
        else:
            self._flick_menu_up(self._date_picker_locator)

        self.wait_for_condition(lambda m: self.date != old_date)

    @property
    def year(self):
        return self.marionette.find_element(*self._current_element(*self._year_picker_locator)).text

    def spin_year(self,direction):
        old_year = self.year
        if direction == 'down':  #decrement the month
            self._flick_menu_down(self._year_picker_locator)
        else:
            self._flick_menu_up(self._year_picker_locator)

        self.wait_for_condition(lambda m: self.year != old_year)

    def _flick_menu_up(self, locator):
        current_element = self.marionette.find_element(*self._current_element(*locator))

        current_element_move_y = current_element.size['height'] * 2.5
        current_element_mid_x = current_element.size['width'] / 2
        current_element_mid_y = current_element.size['height'] / 2
        # TODO: update this with more accurate Actions
        Actions(self.marionette).flick(current_element, current_element_mid_x, current_element_mid_y,
                                       current_element_mid_x, current_element_mid_y - current_element_move_y).perform()

    def _flick_menu_down(self, locator):
        current_element = self.marionette.find_element(*self._current_element(*locator))

        current_element_move_y = current_element.size['height'] * 2.5
        current_element_mid_x = current_element.size['width'] / 2
        current_element_mid_y = current_element.size['height'] / 2
        # TODO: update this with more accurate Actions
        Actions(self.marionette).flick(current_element, current_element_mid_x, current_element_mid_y,
                                       current_element_mid_x, current_element_mid_y + current_element_move_y).perform()

    def _current_element(self, method, target):
        return (method, '%s.picker-unit.selected' % target)

    def _next_element(self, method, target):
        return (method, '%s.picker-unit.selected + div' % target)
