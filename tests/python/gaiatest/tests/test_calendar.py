# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import datetime
import calendar
import time

from gaiatest import GaiaTestCase


DAYS_OF_WEEK = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY',
                'SATURDAY', 'SUNDAY']


class TestCalendar(GaiaTestCase):

    _current_month_year_locator = ('id', 'current-month-year')
    _selected_day_title_locator = ('id', 'selected-day-title')
    _add_event_button_locator = ('xpath', "//a[@href='/add/']")
    _event_title_input_locator = ('xpath', "//input[@data-l10n-id='event-title']")
    _event_location_input_locator = ('xpath', "//input[@data-l10n-id='event-location']")
    _event_start_time_input_locator = ('xpath', "//input[@data-l10n-id='event-start-time']")
    _event_end_time_input_locator = ('xpath', "//input[@data-l10n-id='event-end-time']")
    _save_event_button_locator = ('css selector', 'button.save')
    _event_list_locator = ('id', 'event-list')
    _week_display_button_locator = ('xpath', "//a[@href='/week/']")
    _day_display_button_locator = ('xpath', "//a[@href='/day/']")
    _week_view_locator = ('id', 'week-view')
    _day_view_locator = ('id', 'day-view')
    _delete_event_button_locator = ('css selector', '#modify-event-view button[data-l10n-id=event-delete]')

    def setUp(self):
        GaiaTestCase.setUp(self)

        # launch the Calendar app
        self.app = self.apps.launch('calendar')

    def test_check_today_date(self):
        # https://moztrap.mozilla.org/manage/case/3751/

        # wait for the selected day and month title to render
        self.wait_for_element_displayed(
            *self._current_month_year_locator)
        self.wait_for_element_displayed(
            *self._selected_day_title_locator)

        # find the default selected day and month title
        selected_day = self.marionette.find_element(
            *self._selected_day_title_locator)
        month_title = self.marionette.find_element(
            *self._current_month_year_locator)

        # Get today's date from the phone
        today = self.marionette.execute_script('return new Date().toUTCString();')
        date = datetime.datetime.strptime(today, "%a, %d %b %Y %H:%M:%S %Z")

        # validate month title and selected day aligns with today's date
        self.assertEquals(month_title.text, date.strftime('%B %Y'))
        self.assertEquals(selected_day.text, date.strftime('%A %B %Y').upper())

    def test_that_new_event_appears_on_all_calendar_views(self):
        # https://github.com/mozilla/gaia-ui-tests/issues/102

        event_title = "Event Title %s" % str(time.time())
        event_location = "Event Location %s" % str(time.time())
        event_start_time = "01:00:00"
        event_end_time = "02:00:00"
        formatted_today = time.strftime("%b %d")
        this_event_time_slot_locator = ('css selector',
                                         '#event-list section.hour-1 span.display-hour')
        month_view_time_slot_all_events_locator = ('css selector',
                                                '#event-list section.hour-1 div.events')
        week_view_time_slot_all_events_locator = ('css selector',
                                                "#week-view section.active[data-date*='%s'] ol.hour-1" % formatted_today)
        day_view_time_slot_all_events_locator = ('css selector',
                                                "#day-view section.active[data-date*='%s'] section.hour-1" % formatted_today)
        day_view_time_slot_individual_events_locator = ('css selector',
                                               "#day-view section.active[data-date*='%s'] section.hour-1 div.events div.container" % formatted_today)

        # wait for the add event button to appear
        self.wait_for_element_displayed(*self._add_event_button_locator)

        # click the add event button
        self.marionette.find_element(*self._add_event_button_locator).click()
        self.wait_for_element_displayed(*self._event_title_input_locator)

        # create a new event
        self.marionette.find_element(*self._event_title_input_locator).send_keys(event_title)
        self.marionette.find_element(*self._event_location_input_locator).send_keys(event_location)
        self.marionette.find_element(*self._event_start_time_input_locator).clear()
        self.marionette.find_element(*self._event_start_time_input_locator).send_keys(event_start_time)
        self.marionette.find_element(*self._event_end_time_input_locator).clear()
        self.marionette.find_element(*self._event_end_time_input_locator).send_keys(event_end_time)
        self.marionette.find_element(*self._save_event_button_locator).click()

        # wait for the default calendar display
        self.wait_for_element_displayed(*this_event_time_slot_locator)

        # assert that the event is displayed as expected
        self.assertTrue(self.marionette.find_element(*this_event_time_slot_locator).is_displayed(),
            "Expected the time slot for the event to be present.")
        displayed_events = self.marionette.find_element(*month_view_time_slot_all_events_locator).text
        self.assertIn(event_title, displayed_events)
        self.assertIn(event_location, displayed_events)

        # switch to the week display
        self.marionette.find_element(*self._week_display_button_locator).click()
        self.wait_for_element_displayed(*week_view_time_slot_all_events_locator)
        displayed_events = self.marionette.find_element(*week_view_time_slot_all_events_locator).text
        self.assertIn(event_title, displayed_events)

        # switch to the day display
        self.marionette.find_element(*self._day_display_button_locator).click()
        self.wait_for_element_displayed(*day_view_time_slot_all_events_locator)
        displayed_events = self.marionette.find_element(*day_view_time_slot_all_events_locator).text
        self.assertIn(event_title, displayed_events)
        self.assertIn(event_location, displayed_events)

        # delete all events in the time slot
        all_events = self.marionette.find_elements(*day_view_time_slot_individual_events_locator)
        while len(all_events) > 0:
            all_events[0].click()
            self.wait_for_element_displayed(*self._event_title_input_locator)
            self.marionette.find_element(*self._delete_event_button_locator).click()
            self.wait_for_element_displayed(*self._day_view_locator)
            all_events = self.marionette.find_elements(*day_view_time_slot_individual_events_locator)
