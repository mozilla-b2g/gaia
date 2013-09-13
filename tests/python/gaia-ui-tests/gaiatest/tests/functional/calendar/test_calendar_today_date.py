# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import datetime
from marionette.by import By

from gaiatest import GaiaTestCase


class TestCalendar(GaiaTestCase):

    _current_month_year_locator = (By.ID, 'current-month-year')
    _current_month_day_locator = (By.ID, 'months-day-view')

    def setUp(self):
        GaiaTestCase.setUp(self)

        if self.device.is_android_build:

            # Setting the time on the device back to 12:00am of the current day
            # this way the event created will always be on this day and we can check it easily

            _seconds_since_epoch = self.marionette.execute_script("return Date.now();")

            self.today = datetime.datetime.fromtimestamp(_seconds_since_epoch / 1000)

            # set the system date to the time
            self.data_layer.set_time(_seconds_since_epoch)
        else:
            self.today = datetime.date.today()

        # launch the Calendar app
        self.app = self.apps.launch('calendar')

    def test_check_today_date(self):
        # https://moztrap.mozilla.org/manage/case/3751/

        # wait for the selected day and month title to render
        self.wait_for_element_displayed(
            *self._current_month_year_locator)
        self.wait_for_element_displayed(
            *self._current_month_day_locator)

        # find the default current day and month title
        current_date = self.marionette.find_element(
            *self._current_month_day_locator).get_attribute('data-date')
        month_title = self.marionette.find_element(
            *self._current_month_year_locator)

        # validate month title and current day aligns with today's date
        self.assertEquals(month_title.text, self.today.strftime('%B %Y'))
        self.assertIn(self.today.strftime('%a %b %d %Y'), current_date)
