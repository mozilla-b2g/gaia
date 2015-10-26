# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import Wait

from gaiatest import GaiaTestCase
from gaiatest.apps.calendar.app import Calendar


class TestCalendarDayViewAccessibility(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

        self.calendar = Calendar(self.marionette)
        self.calendar.launch()

        self.event_title = 'title'
        self.calendar.a11y_create_event(self.event_title)

    def test_a11y_calendar_day_view(self):

        self.calendar.a11y_click_day_display_button()

        # Click on the all day section to create an event.
        element = Wait(self.marionette).until(
                       expected.element_present(*self.calendar._day_view_all_day_button))
        Wait(self.marionette).until(expected.element_displayed(element))
        self.accessibility.click(element)

        # wait for new event
        new_event = self.calendar.wait_for_new_event()
        self.assertTrue(self.accessibility.is_visible(self.marionette.find_element(
            *self.calendar._modify_event_view_locator)))

        # close new event
        new_event.a11y_click_close_button()
        self.assertTrue(self.accessibility.is_visible(self.marionette.find_element(
            *self.calendar._day_view_locator)))

        # open existing event detail
        event_detail = self.calendar.a11y_click_day_view_event()
        self.assertTrue(self.accessibility.is_visible(self.marionette.find_element(
            *self.calendar._event_view_locator)))
        # Make sure that the title and the location correspond to the selected event.
        self.assertEquals(event_detail.title, self.event_title)
