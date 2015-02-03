# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from marionette import expected
from marionette import Wait
from gaiatest.apps.base import Base


class DateAndTime(Base):
    _24h_selector_locator = (By.CSS_SELECTOR, 'select.time-format-time')

    def __init__(self, marionette):
        Base.__init__(self, marionette)

        Wait(self.marionette).until(expected.element_displayed(
            Wait(self.marionette).until(
                expected.element_present(*self._24h_selector_locator))))

    def select_time_format(self, time_format):
        self.marionette.find_element(*self._24h_selector_locator).tap()
        self.select(time_format)
