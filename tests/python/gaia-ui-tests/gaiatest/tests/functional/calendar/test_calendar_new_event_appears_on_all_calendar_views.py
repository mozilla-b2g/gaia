# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import datetime
import time

from marionette.by import By
from gaiatest import GaiaTestCase


DAYS_OF_WEEK = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY',
                'SATURDAY', 'SUNDAY']


class TestCalendar(GaiaTestCase):

    _add_event_button_locator = (By.XPATH, "//a[@href='/event/add/']")
    _event_title_input_locator = (By.XPATH, "//input[@data-l10n-id='event-title']")
    _event_location_input_locator = (By.XPATH, "//input[@data-l10n-id='event-location']")
    _event_start_time_input_locator = (By.XPATH, "//input[@data-l10n-id='event-start-time']")
    _event_end_time_input_locator = (By.XPATH, "//input[@data-l10n-id='event-end-time']")
    _edit_event_button_locator = (By.CSS_SELECTOR, 'button.edit')
    _save_event_button_locator = (By.CSS_SELECTOR, 'button.save')
    _week_display_button_locator = (By.XPATH, "//a[@href='/week/']")
    _day_display_button_locator = (By.XPATH, "//a[@href='/day/']")
    _day_view_locator = (By.ID, 'day-view')
    _delete_event_button_locator = (By.CSS_SELECTOR, "#modify-event-view a[data-l10n-id='event-delete']")

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
            self.today = datetime.date.today()

        # launch the Calendar app
        self.app = self.apps.launch('Calendar')

    def test_that_new_event_appears_on_all_calendar_views(self):
        # https://github.com/mozilla/gaia-ui-tests/issues/102

        event_title = "Event Title %s" % str(time.time())
        event_location = "Event Location %s" % str(time.time())
        event_start_time = "01:00:00"
        event_end_time = "02:00:00"
        formatted_today = self.today.strftime("%b %d")
        this_event_time_slot_locator = (
            By.CSS_SELECTOR,
            '#event-list section.hour-1 span.display-hour')
        month_view_time_slot_all_events_locator = (
            By.CSS_SELECTOR,
            '#event-list section.hour-1 div.events')
        week_view_time_slot_all_events_locator = (
            By.CSS_SELECTOR,
            "#week-view section.active[data-date*='%s'] ol.hour-1" % formatted_today)
        day_view_time_slot_all_events_locator = (
            By.CSS_SELECTOR,
            "#day-view section.active[data-date*='%s'] section.hour-1" % formatted_today)
        day_view_time_slot_individual_events_locator = (
            By.CSS_SELECTOR,
            "#day-view section.active[data-date*='%s'] section.hour-1 div.events div.container" % formatted_today)

        # wait for the add event button to appear
        self.wait_for_element_displayed(*self._add_event_button_locator)

        # click the add event button
        add_event_button = self.marionette.find_element(*self._add_event_button_locator)
        add_event_button.tap()
        self.wait_for_element_displayed(*self._event_title_input_locator)

        # create a new event
        self.marionette.find_element(*self._event_title_input_locator).send_keys(event_title)
        self.marionette.find_element(*self._event_location_input_locator).send_keys(event_location)
        self.marionette.find_element(*self._event_start_time_input_locator).clear()
        self.marionette.find_element(*self._event_start_time_input_locator).send_keys(event_start_time)
        self.marionette.find_element(*self._event_end_time_input_locator).clear()
        self.marionette.find_element(*self._event_end_time_input_locator).send_keys(event_end_time)
        save_event_button = self.marionette.find_element(*self._save_event_button_locator)
        save_event_button.tap()

        # wait for the default calendar display
        self.wait_for_element_displayed(*this_event_time_slot_locator)

        # assert that the event is displayed as expected
        self.assertTrue(self.marionette.find_element(*this_event_time_slot_locator).is_displayed(),
                        "Expected the time slot for the event to be present.")
        displayed_events = self.marionette.find_element(*month_view_time_slot_all_events_locator).text
        self.assertIn(event_title, displayed_events)
        self.assertIn(event_location, displayed_events)

        # switch to the week display
        week_display_button = self.marionette.find_element(*self._week_display_button_locator)
        # TODO: Switch to el.tap() when bug #875768 gets fixed
        week_display_button.click()

        self.wait_for_element_displayed(*week_view_time_slot_all_events_locator)
        displayed_events = self.marionette.find_element(*week_view_time_slot_all_events_locator).text
        self.assertIn(event_title, displayed_events)

        # switch to the day display
        day_display_button = self.marionette.find_element(*self._day_display_button_locator)
        # TODO: Switch to el.tap() when bug #875768 gets fixed
        day_display_button.click()

        self.wait_for_element_displayed(*day_view_time_slot_all_events_locator)
        displayed_events = self.marionette.find_element(*day_view_time_slot_all_events_locator).text
        self.assertIn(event_title, displayed_events)
        self.assertIn(event_location, displayed_events)
