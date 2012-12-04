# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import datetime
import calendar

from gaiatest import GaiaTestCase


DAYS_OF_WEEK = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY',
                'SATURDAY', 'SUNDAY']


class TestCalendar(GaiaTestCase):

    _current_month_year_locator = ('id', 'current-month-year')
    _selected_day_title_locator = ('id', 'selected-day-title')

    def setUp(self):

        GaiaTestCase.setUp(self)

        # unlock the lockscreen if it's locked
        self.lockscreen.unlock()

        # launch the Calendar app
        self.app = self.apps.launch('calendar')

    def test_check_today_date(self):
        # https://moztrap.mozilla.org/manage/case/3751/

        # wait for the selected day and month title to render
        self.wait_for_element_displayed(
            *self._current_month_year_locator)
        self.wait_for_element_displayed(
            *self._selected_day_title_locator)

        # find the default selected day and month title
        selected_day = self.marionette.find_element(
            *self._selected_day_title_locator)
        month_title = self.marionette.find_element(
            *self._current_month_year_locator)

        # Get today's date - month, year, weekday       
        today = datetime.datetime.today()
        month = calendar.month_name[today.month]
        year = today.year
        weekday = DAYS_OF_WEEK[today.weekday()]

        # validate month title and selected day aligns with today's date
        self.assertEquals(month_title.text, '%s %s' % (month, year),
            "wrong month title for today");
        self.assertEquals(selected_day.text, '%s %s %s' % (weekday,
            month.upper(), year), "wrong selected day for today")

    def tearDown(self):

        # close the app
        if hasattr(self, 'app'):
            self.apps.kill(self.app)

        GaiaTestCase.tearDown(self)

