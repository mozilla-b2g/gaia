# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from datetime import datetime, timedelta

from gaiatest import GaiaTestCase
from gaiatest.apps.calendar.app import Calendar


class TestCalendar(GaiaTestCase):


    def test_that_new_event_appears_on_all_calendar_views(self):

        # We get the actual time of the device
        _seconds_since_epoch = self.marionette.execute_script("return Date.now();")
        now = datetime.fromtimestamp(_seconds_since_epoch / 1000)

        # We know that the default event time will be rounded up 1 hour
        event_start_date_time = now + timedelta(hours=1)

        event_title = 'Event Title %s' % str(event_start_date_time.time())
        event_location = 'Event Location %s' % str(event_start_date_time.time())

        calendar = Calendar(self.marionette)
        calendar.launch()
        new_event = calendar.tap_add_event_button()

        # create a new event
        new_event.fill_event_title(event_title)
        new_event.fill_event_location(event_location)

        new_event.tap_save_event()

        # assert that the event is displayed as expected in month view
        self.assertIn(event_title, calendar.displayed_events_in_month_view(event_start_date_time))
        self.assertIn(event_location, calendar.displayed_events_in_month_view(event_start_date_time))

        # switch to the week display
        calendar.tap_week_display_button()
        self.assertIn(event_title, calendar.displayed_events_in_week_view(event_start_date_time))

        # switch to the day display
        calendar.tap_day_display_button()
        self.assertIn(event_title, calendar.displayed_events_in_day_view(event_start_date_time))
        self.assertIn(event_location, calendar.displayed_events_in_day_view(event_start_date_time))
