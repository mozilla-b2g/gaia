# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from datetime import datetime

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base


class DateAndTime(Base):
    _24h_selector_locator = (By.CSS_SELECTOR, 'select.time-format-time')
    _autotime_enabled_locator = (By.CSS_SELECTOR, '.time-auto')
    _autotime_enabled_switch_locator = (By.CSS_SELECTOR, '.time-auto label')
    _time_value = (By.CSS_SELECTOR, '.clock-time')

    _timezone_region_locator = (By.CLASS_NAME, 'timezone-region')
    _timezone_city_locator = (By.CLASS_NAME, 'timezone-city')
    _timezone_selection_locator = (By.CSS_SELECTOR, '.value-selector-container li')
    _timezone_confirm_button_locator = (By.CSS_SELECTOR, 'button.value-option-confirm')
    def __init__(self, marionette):
        Base.__init__(self, marionette)

        Wait(self.marionette).until(expected.element_displayed(
            Wait(self.marionette).until(
                expected.element_present(*self._24h_selector_locator))))

    def select_time_format(self, time_format):
        self.marionette.find_element(*self._24h_selector_locator).tap()
        self.select(time_format)

    def toggle_automatic_time_update(self):

        old_state = self.is_autotime_enabled
        Wait(self.marionette).until(expected.element_displayed(
            Wait(self.marionette).until(
                expected.element_present(*self._autotime_enabled_locator))))

        self.marionette.find_element(*self._autotime_enabled_switch_locator).tap()

        self.wait_for_condition(lambda m: self.is_autotime_enabled != old_state)

    def set_region(self, region):

        self.marionette.find_element(*self._timezone_region_locator).tap()
        self.marionette.switch_to_frame()
        self.wait_for_condition(
            lambda m: len(self.marionette.find_elements(*self._timezone_selection_locator)) > 0)

        options = self.marionette.find_elements(*self._timezone_selection_locator)

        # loop options until we find the match
        for li in options:
            if region in li.text:
                li.tap()
                break
        else:
            raise Exception("Element '%s' could not be found in select wrapper" % region)

        close_button = self.marionette.find_element(*self._timezone_confirm_button_locator)
        close_button.tap()
        self.apps.switch_to_displayed_app()

    @property
    def is_autotime_enabled(self):
        return self.marionette.find_element(*self._autotime_enabled_locator).get_attribute('data-state') == 'auto'

    @property
    def get_current_time_text(self):
        return self.marionette.find_element(*self._time_value).text

    @property
    def get_current_time_datetime(self):
        return datetime.strptime(self.get_current_time_text, '%I:%M %p')
