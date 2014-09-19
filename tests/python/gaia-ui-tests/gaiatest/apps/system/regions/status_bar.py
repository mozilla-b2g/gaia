# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.base import Base


class StatusBar(Base):
    _status_bar_time_locator = (By.ID, 'statusbar-time')
    _status_bar_maximized_wrapper = (By.ID, 'statusbar-maximized-wrapper')
    _status_bar_minimized_wrapper = (By.ID, 'statusbar-minimized-wrapper')

    @property
    def is_status_bar_maximized_wrapper_a11y_hidden(self):
        return self.accessibility.is_hidden(self.marionette.find_element(
            *self._status_bar_maximized_wrapper))

    @property
    def is_status_bar_minimized_wrapper_a11y_hidden(self):
        return self.accessibility.is_hidden(self.marionette.find_element(
            *self._status_bar_minimized_wrapper))

    def a11y_wheel_status_bar_time(self):
        self.accessibility.wheel(self.marionette.find_element(
            *self._status_bar_time_locator), 'down')
