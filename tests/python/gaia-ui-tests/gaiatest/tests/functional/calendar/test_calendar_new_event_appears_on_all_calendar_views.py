# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import datetime

from gaiatest import GaiaTestCase
from gaiatest.apps.calendar.app import Calendar

DAYS_OF_WEEK = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']


class TestCalendar(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

        if self.device.is_android_build:

            # Setting the time on the device back to 12:00am of the current day
            # this way the event created will always be on this day and we can check it easily
            _seconds_since_epoch = self.marionette.execute_script("""
                    var today = new Date();
                    var yr = today.getFullYear();
                    var mth = today.getMonth();
                    var day = today.getDate();
                    return new Date(yr, mth, day, 0, 0, 0).getTime();""")

            self.today = datetime.datetime.fromtimestamp(_seconds_since_epoch / 1000)

            # set the system date to the time
            self.data_layer.set_time(_seconds_since_epoch)
        else:
            self.today = datetime.datetime.now()

    def test_that_new_event_appears_on_all_calendar_views(self):

        event_title = 'Event Title %s' % str(self.today.time())
        event_location = 'Event Location %s' % str(self.today.time())
        event_start_date_time = self.today.replace(hour=1, minute=0, second=0)
        event_end_date_time = self.today.replace(hour=2, minute=0, second=0)
        EVENT_DATE_TIME_TO_STRING_PATTERN = '%H:%M:%S'

        calendar = Calendar(self.marionette)
        calendar.launch()
        new_event = calendar.tap_add_event_button()

        # create a new event
        new_event.fill_event_title(event_title)
        new_event.fill_event_location(event_location)
        new_event.fill_event_start_time(event_start_date_time.strftime(EVENT_DATE_TIME_TO_STRING_PATTERN))
        new_event.fill_event_end_time(event_end_date_time.strftime(EVENT_DATE_TIME_TO_STRING_PATTERN))
        new_event.tap_save_event()

        # assert that the event is displayed as expected in month view
        self.assertIn(event_title, calendar.displayed_events_in_month_view(event_start_date_time))
        self.assertIn(event_location, calendar.displayed_events_in_month_view(event_start_date_time))

        # switch to the week display
        calendar.click_week_display_button()
        self.assertIn(event_title, calendar.displayed_events_in_week_view(event_start_date_time))

        # switch to the day display
        calendar.click_day_display_button()
        self.assertIn(event_title, calendar.displayed_events_in_day_view(event_start_date_time))
        self.assertIn(event_location, calendar.displayed_events_in_day_view(event_start_date_time))
