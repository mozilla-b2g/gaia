# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import By, Wait
from marionette_driver.errors import StaleElementException
from gaiatest.apps.base import PageRegion


class StatusBar(PageRegion):

    _status_bar_maximized_locator = (By.ID, 'statusbar-maximized-wrapper')
    _status_bar_minimized_locator = (By.ID, 'statusbar-minimized-wrapper')

    @property
    def height(self):
        return self.root_element.rect['height']

    @property
    def minimized(self):
        """
        Status bar in its minimized form. When the RocketBar is at the same level with the connectivity icons.
        Usually seen when a app is open
        """
        return self.StatusBarRegion(self.marionette, self._status_bar_minimized_locator)

    @property
    def maximized(self):
        """
        Status bar in its maximized form. When the RocketBar is under the connectivity icons.
        Usually seen in HomeScreen
        """
        return self.StatusBarRegion(self.marionette, self._status_bar_maximized_locator)

    @property
    def is_displayed(self):
        return self.root_element.is_displayed()

    @property
    def is_status_bar_maximized_wrapper_a11y_hidden(self):
        return self.accessibility.is_hidden(self.marionette.find_element(
            *self._status_bar_maximized_locator))

    @property
    def is_status_bar_minimized_wrapper_a11y_hidden(self):
        return self.accessibility.is_hidden(self.marionette.find_element(
            *self._status_bar_minimized_locator))

    class StatusBarRegion(PageRegion):
        _time_locator = (By.ID, 'statusbar-time')
        _battery_locator = (By.ID, 'statusbar-battery')
        _data_connection = (By.CSS_SELECTOR, '#statusbar-mobile-connection .statusbar-data')

        def __init__(self, marionette, locator):
            element = marionette.find_element(*locator)
            PageRegion.__init__(self, marionette, element)
            self._locator = locator

        @property
        def time(self):
            return self.root_element.find_element(*self._time_locator).text

        @property
        def is_battery_displayed(self):
            battery_icon = self.root_element.find_element(*self._battery_locator)
            return battery_icon.is_displayed()

        def wait_for_data_to_be_connected(self):
            self._safe_wait(lambda n: self.is_data_connected)

        @property
        def is_data_connected(self):
            element = self.root_element.find_element(*self._data_connection)
            return element.get_attribute('hidden') != 'true'

        def _safe_wait(self, condition):
            # The status bar is removed from the DOM each time an element of the status bar is changed.
            # Marionette can loose while performing a wait.
            try:
                Wait(self.marionette).until(condition)
            except StaleElementException:
                self.root_element = self.marionette.find_element(*self._locator)
                self._safe_wait(condition)

        def a11y_wheel_status_bar_time(self):
            self.accessibility.wheel(self.root_element.find_element(*self._time_locator), 'down')
