# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import datetime

from gaiatest import GaiaTestCase
from gaiatest.apps.calendar.app import Calendar


class TestCalendarMonthViewWheelAccessibility(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

        self.today = datetime.date.today()
        # Determine the name and the year of the next month
        self.next_month_year = self.today.replace(day=1) + datetime.timedelta(days=32)

        self.calendar = Calendar(self.marionette)
        self.calendar.launch()

    def test_a11y_calendar_month_view_wheel(self):

        MONTH_YEAR_PATTERN = '%b %Y'

        # Swipe left with 2 fingers.
        self.calendar.a11y_wheel_to_next_month()

        # Check that the grid updated to the next month.
        self.assertEquals(self.next_month_year.strftime(MONTH_YEAR_PATTERN),
                          self.calendar.current_month_year)

        # Swipe right with 2 fingers.
        self.calendar.a11y_wheel_to_previous_month()

        # Check that we moved back to the current month.
        self.assertEquals(self.today.strftime(MONTH_YEAR_PATTERN), self.calendar.current_month_year)
