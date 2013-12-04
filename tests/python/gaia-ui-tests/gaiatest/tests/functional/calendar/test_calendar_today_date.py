# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from datetime import datetime

from gaiatest import GaiaTestCase
from gaiatest.apps.calendar.app import Calendar


class TestCalendar(GaiaTestCase):

    def test_check_today_date(self):

        # We get the actual time of the device
        _seconds_since_epoch = self.marionette.execute_script("return Date.now();")
        now = datetime.fromtimestamp(_seconds_since_epoch / 1000)

        calendar = Calendar(self.marionette)
        calendar.launch()

        self.assertEquals(now.strftime('%B %Y'), calendar.current_month_year)
        self.assertIn(now.strftime('%a %b %d %Y'), calendar.current_month_day)
