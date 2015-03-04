# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import Wait

from gaiatest import GaiaTestCase
from gaiatest.apps.calendar.app import Calendar


class TestCalendarMonthViewSelectEventAccessibility(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

        self.event_title = 'title'
        self.event_location = 'location'

        self.calendar = Calendar(self.marionette)
        self.calendar.launch()

        new_event = self.calendar.a11y_click_add_event_button()

        # create a new event
        new_event.a11y_fill_event_title(self.event_title)
        new_event.a11y_fill_event_location(self.event_location)

        new_event.a11y_click_save_event()

        self.calendar.wait_for_events(1)

    def test_a11y_calendar_month_view_select_event(self):

        event = self.calendar.event(self.event_title)
        # Make sure that the title and the location are correct
        self.assertEquals(event.title, self.event_title)
        self.assertEquals(event.location, self.event_location)

        event_detail = event.a11y_click()

        # Make sure that the title and the location correspond to the selected event.
        # Note: title and location are populated asynchronously
        Wait(self.marionette).until(lambda m: self.event_title == event_detail.title)
        Wait(self.marionette).until(lambda m: self.event_location == event_detail.location)
