# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import By, Wait

from gaiatest.apps.calendar.app import Calendar
from gaiatest.gaia_graphics_test import GaiaImageCompareTestCase


class TestCalendar(GaiaImageCompareTestCase):

    _week_event_link_locator = (By.CLASS_NAME,
                                'event calendar-id-local-first calendar-display '
                                'calendar-bg-color calendar-border-color')
    _day_event_link_locator = (By.CLASS_NAME, 'event calendar-id-local-first calendar-display calendar-bg-color')
    _created_event_locator = (By.CLASS_NAME, 'md__event')
    _edit_button_locator = (By.CLASS_NAME, 'edit')
    _delete_button_locator = (By.CLASS_NAME, 'danger delete-record bb-button')
    _seconds_since_epoch = 1357043430

    def setUp(self):
        GaiaImageCompareTestCase.setUp(self)

        # set the system date to an expected date, and timezone to UTC
        self.data_layer.set_time(self._seconds_since_epoch * 1000)
        self.data_layer.set_setting('time.timezone', 'Atlantic/Reykjavik')

    def test_calendar_new_event_appears_on_all_calendar_views(self):
        """https://moztrap.mozilla.org/manage/case/6118/"""

        event_title = 'Event Title Goes here'
        event_location = 'Event Location Goes here'

        calendar = Calendar(self.marionette)
        calendar.launch()
        new_event = calendar.tap_add_event_button()
        self.take_screenshot()

        # create a new event
        new_event.fill_event_title(event_title)
        new_event.fill_event_location(event_location)
        self.take_screenshot()

        event_start_date_time = new_event.tap_save_event()

        # assert that the event is displayed as expected in month view
        self.assertIn(event_title, calendar.displayed_events_in_month_view(event_start_date_time))
        self.assertIn(event_location, calendar.displayed_events_in_month_view(event_start_date_time))
        self.take_screenshot()

        # switch to the week display
        calendar.tap_week_display_button()

        self.assertIn(event_title, calendar.displayed_events_in_week_view(event_start_date_time))
        Wait(self.marionette).until(lambda m: self.is_element_displayed(*self._created_event_locator))
        self.take_screenshot()

        # switch to the day display
        calendar.tap_day_display_button()
        self.assertIn(event_title, calendar.displayed_events_in_day_view(event_start_date_time))
        self.assertIn(event_location, calendar.displayed_events_in_day_view(event_start_date_time))
        self.take_screenshot()
