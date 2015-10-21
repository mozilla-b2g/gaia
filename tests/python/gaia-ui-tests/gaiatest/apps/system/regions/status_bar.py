# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import By

from gaiatest.apps.base import Base
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
        mini = self.root_element.find_element(*self._status_bar_minimized_locator)
        return self.StatusBarRegion(self.marionette, mini)


    @property
    def maximized(self):
        """
        Status bar in its maximized form. When the RocketBar under the connectivity icons.
        Usually seen in HomeScreen
        """
        maxi = self.root_element.find_element(*self._status_bar_maximized_locator)
        return self.StatusBarRegion(self.marionette, maxi)


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
        _status_bar_time_locator = (By.ID, 'statusbar-time')
        _status_bar_battery_locator = (By.ID, 'statusbar-battery')

        @property
        def time(self):
            return self.root_element.find_element(*self._status_bar_time_locator).text

        @property
        def is_battery_displayed(self):
            battery_icon = self.root_element.find_element(
                *self._status_bar_battery_locator)
            return battery_icon.is_displayed()

        def a11y_wheel_status_bar_time(self):
            self.accessibility.wheel(self.root_element.find_element(
                *self._status_bar_time_locator), 'down')
