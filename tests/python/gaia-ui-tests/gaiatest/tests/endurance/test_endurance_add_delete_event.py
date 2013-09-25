# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

# Approximate runtime per 100 iterations: 26 minutes

from gaiatest import GaiaEnduranceTestCase

import datetime
import time


class TestEnduranceAddDeleteEvent(GaiaEnduranceTestCase):

    _add_event_button_locator = ('xpath', "//span[@data-l10n-id='new-event']")
    _event_title_input_locator = ('xpath', "//input[@data-l10n-id='event-title']")
    _event_location_input_locator = ('xpath', "//input[@data-l10n-id='event-location']")
    _event_start_time_input_locator = ('xpath', "//input[@data-l10n-id='event-start-time']")
    _event_end_time_input_locator = ('xpath', "//input[@data-l10n-id='event-end-time']")
    _save_event_button_locator = ('css selector', 'button.save')
    _edit_event_button_locator = ('css selector', 'button.edit')
    _delete_event_button_locator = ('css selector', "#modify-event-view a[data-l10n-id='event-delete']")
    _event_start_date_input_locator = ('xpath', "//input[@data-l10n-id='event-start-date']")
    _event_end_date_input_locator = ('xpath', "//input[@data-l10n-id='event-end-date']")
    _this_event_time_slot_locator = ('css selector', '#event-list section.hour-1 span.display-hour')
    _month_view_time_slot_all_events_locator = ('css selector', '#event-list section.hour-1 div.events')

    def setUp(self):
        GaiaEnduranceTestCase.setUp(self)

        # Setting the system time to a hardcoded datetime to avoid timezone issues
        # Jan. 1, 2013, according to http://www.epochconverter.com/
        _seconds_since_epoch = 1357043430
        self.today = datetime.datetime.utcfromtimestamp(_seconds_since_epoch)

        # set the system date to an expected date, and timezone to UTC
        self.data_layer.set_time(_seconds_since_epoch * 1000)
        self.data_layer.set_setting('time.timezone', 'Atlantic/Reykjavik')

        # Starting event
        self.next_event_date = self.today

        # launch the Calendar app
        self.app = self.apps.launch('calendar')

    def test_endurance_add_delete_event(self):
        self.drive(test=self.add_delete_event, app='calendar')

    def add_delete_event(self):
        # Add a calendar event on the next day and verify
        # Borrowed some code from test_add_calendar.py
        event_title = "Event %d of %d" % (self.iteration, self.iterations)
        event_location = "Event Location %s" % str(time.time())
        event_start_date = self.next_event_date.strftime("%Y-%m-%d")
        event_end_date = self.next_event_date.strftime("%Y-%m-%d")
        event_start_time = "01:00:00"
        event_end_time = "02:00:00"

        # wait for the add event button to appear
        self.wait_for_element_displayed(*self._add_event_button_locator)

        # click the add event button
        time.sleep(1)
        add_event_button = self.marionette.find_element(*self._add_event_button_locator)
        add_event_button.tap()
        self.wait_for_element_displayed(*self._event_title_input_locator)

        # create a new event
        self.marionette.find_element(*self._event_title_input_locator).send_keys(event_title)
        self.marionette.find_element(*self._event_location_input_locator).send_keys(event_location)
        self.marionette.find_element(*self._event_start_date_input_locator).clear()
        self.marionette.find_element(*self._event_start_date_input_locator).send_keys(event_start_date)
        self.marionette.find_element(*self._event_end_date_input_locator).clear()
        self.marionette.find_element(*self._event_end_date_input_locator).send_keys(event_end_date)       
        self.marionette.find_element(*self._event_start_time_input_locator).clear()
        self.marionette.find_element(*self._event_start_time_input_locator).send_keys(event_start_time)
        self.marionette.find_element(*self._event_end_time_input_locator).clear()
        self.marionette.find_element(*self._event_end_time_input_locator).send_keys(event_end_time)
        time.sleep(1)
        save_event_button = self.marionette.find_element(*self._save_event_button_locator)
        save_event_button.tap()
        time.sleep(2)

        # wait for the default calendar display
        self.wait_for_element_displayed(*self._this_event_time_slot_locator)

        # assert that the event is displayed as expected
        self.assertTrue(self.marionette.find_element(*self._this_event_time_slot_locator).is_displayed(),
                        "Expected the time slot for the event to be present.")
        displayed_events = self.marionette.find_element(*self._month_view_time_slot_all_events_locator).text
        self.assertIn(event_title, displayed_events)
        self.assertIn(event_location, displayed_events)

        # Now tap on the event to open it
        event_list = self.marionette.find_element(*self._month_view_time_slot_all_events_locator)
        event_list.tap()

        # Then delete it
        self.wait_for_element_displayed(*self._delete_event_button_locator)
        delete_event_button = self.marionette.find_element(*self._delete_event_button_locator)
        delete_event_button.tap()
        self.wait_for_element_displayed(*self._this_event_time_slot_locator)

        # Increment for the next event
        self.next_event_date += datetime.timedelta(days=1)

        # Wait between reps
        time.sleep(3)
