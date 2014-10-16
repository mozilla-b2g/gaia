# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import datetime

from gaiatest import GaiaTestCase
from gaiatest.apps.calendar.app import Calendar
from marionette.by import By


class TestCalendarMonthViewSelectDayAccessibility(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

        self.today = datetime.date.today()
        self.next_day = self.today + datetime.timedelta(days=1)

        self.calendar = Calendar(self.marionette)
        self.calendar.launch()

    def test_a11y_calendar_month_view_select_day(self):

        WEEKDAY_MONTH_DAY_PATTERN = '%A, %b %-d'

        # By default current date event list should be rendered.
        self.assertEquals(self.today.strftime(WEEKDAY_MONTH_DAY_PATTERN).upper(),
                          self.calendar.event_list_date)

        # Click on tomorrow in the grid.
        self.calendar.a11y_click_tomorrow()

        # Tomorrow date's event list should be rendered.
        self.assertEquals(self.next_day.strftime(WEEKDAY_MONTH_DAY_PATTERN).upper(),
                          self.calendar.event_list_date)
