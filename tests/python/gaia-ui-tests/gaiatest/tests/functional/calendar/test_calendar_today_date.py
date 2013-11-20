# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import datetime

from gaiatest import GaiaTestCase
from gaiatest.apps.calendar.app import Calendar


class TestCalendar(GaiaTestCase):

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

    def test_check_today_date(self):
        calendar = Calendar(self.marionette)
        calendar.launch()

        self.assertEquals(self.today.strftime('%B %Y'), calendar.current_month_year)
        self.assertIn(self.today.strftime('%a %b %d %Y'), calendar.current_month_day)
