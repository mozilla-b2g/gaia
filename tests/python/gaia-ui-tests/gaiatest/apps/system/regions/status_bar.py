# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.base import Base


class StatusBar(Base):
    _status_bar_time_locator = (By.ID, 'statusbar-time')

    def a11y_wheel_status_bar_time(self):
        self.accessibility.wheel(self.marionette.find_element(
            *self._status_bar_time_locator), 'down')
