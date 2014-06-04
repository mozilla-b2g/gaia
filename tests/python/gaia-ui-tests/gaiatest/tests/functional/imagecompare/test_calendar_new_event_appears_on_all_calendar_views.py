# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from datetime import datetime, timedelta

from marionette.by import By
from gaiatest import GaiaTestCase
from gaiatest.apps.calendar.app import Calendar
from gaiatest.utils.Imagecompare.imagecompare_util import ImageCompareUtil
import sys

class TestCalendar(GaiaTestCase):

    _week_event_link_locator = (By.CLASS_NAME, 'event calendar-id-local-first calendar-display calendar-bg-color calendar-border-color')
    _day_event_link_locator = (By.CLASS_NAME, 'event calendar-id-local-first calendar-display calendar-bg-color')

    def setUp(self):
        GaiaTestCase.setUp(self)

        current_module = str(sys.modules[__name__])
        self.module_name = current_module[current_module.find("'")+1:current_module.find("' from")]
        self.graphics = ImageCompareUtil(self.marionette,self.apps, '.')

    def test_that_new_event_appears_on_all_calendar_views(self):
        """https://moztrap.mozilla.org/manage/case/6118/"""

        # We get the actual time of the device
        #_seconds_since_epoch = self.marionette.execute_script("return Date.now();")
        #now = datetime.fromtimestamp(_seconds_since_epoch / 1000)

        event_title = 'Event Title Goes here'
        event_location = 'Event Location Goes here'

        calendar = Calendar(self.marionette)
        calendar.launch()
        new_event = calendar.tap_add_event_button()
        self.graphics.invoke_screen_capture()

        # create a new event
        new_event.fill_event_title(event_title)
        new_event.fill_event_location(event_location)
        self.graphics.invoke_screen_capture()

        event_start_date_time = new_event.tap_save_event()

        # assert that the event is displayed as expected in month view
        self.assertIn(event_title, calendar.displayed_events_in_month_view(event_start_date_time))
        self.assertIn(event_location, calendar.displayed_events_in_month_view(event_start_date_time))
        self.graphics.invoke_screen_capture()

        # switch to the week display
        calendar.tap_week_display_button()
        event_link = self.marionette.find_element(*self._week_event_link_locator)
        # TODO: remove the explicit scroll once bug 833370 is fixed
        self.marionette.execute_script("arguments[0].scrollIntoView(true);", [event_link])

        self.assertIn(event_title, calendar.displayed_events_in_week_view(event_start_date_time))
        self.graphics.invoke_screen_capture()

        # switch to the day display
        calendar.tap_day_display_button()
        event_link = self.marionette.find_element(*self._day_event_link_locator)
        # TODO: remove the explicit scroll once bug 833370 is fixed
        self.marionette.execute_script("arguments[0].scrollIntoView(true);", [event_link])
        self.assertIn(event_title, calendar.displayed_events_in_day_view(event_start_date_time))
        self.assertIn(event_location, calendar.displayed_events_in_day_view(event_start_date_time))
        self.graphics.invoke_screen_capture()

    def tearDown(self):

        # In case the assertion fails this will still kill the call
        # An open call creates problems for future tests
        self.graphics.execute_image_job(self)

        GaiaTestCase.tearDown(self)