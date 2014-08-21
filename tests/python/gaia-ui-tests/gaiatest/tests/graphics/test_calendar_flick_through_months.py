# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import datetime

from gaiatest.apps.calendar.app import Calendar
from gaiatest.gaia_graphics_test import GaiaImageCompareTestCase
import sys

class TestCalendar(GaiaImageCompareTestCase):

    def setUp(self):
        GaiaImageCompareTestCase.setUp(self)

        self.today = datetime.date.today()
        # Determine the name and the year of the next month
        self.next_month_year = self.today.replace(day=1) + datetime.timedelta(days=32)

    def test_calendar_flick_through_months(self):
        """https://bugzilla.mozilla.org/show_bug.cgi?id=937085"""

        MONTH_YEAR_PATTERN = '%b %Y'

        calendar = Calendar(self.marionette)
        calendar.launch()
        self.invoke_screen_capture()

        calendar.flick_to_next_month()
        self.assertEquals(self.next_month_year.strftime(MONTH_YEAR_PATTERN),
                          calendar.current_month_year)
        self.invoke_screen_capture()

        calendar.flick_to_previous_month()
        self.assertEquals(self.today.strftime(MONTH_YEAR_PATTERN), calendar.current_month_year)
        self.invoke_screen_capture()

        calendar.flick_to_previous_month()
        self.invoke_screen_capture()
        calendar.flick_to_previous_month()
        self.invoke_screen_capture()
        calendar.flick_to_previous_month()
        self.invoke_screen_capture()
        calendar.flick_to_previous_month()
        self.invoke_screen_capture()
        calendar.flick_to_previous_month()
        self.invoke_screen_capture()

    def tearDown(self):

        GaiaImageCompareTestCase.tearDown(self)