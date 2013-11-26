# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.base import Base


class Calendar(Base):

    name = 'Calendar'

    _current_month_year_locator = (By.ID, 'current-month-year')
    _current_months_day_locator = (By.ID, 'months-day-view')
    _add_event_button_locator = (By.XPATH, "//a[@href='/event/add/']")
    _event_title_input_locator = (By.XPATH, "//input[@data-l10n-id='event-title']")

    _week_display_button_locator = (By.XPATH, "//a[@href='/week/']")
    _day_display_button_locator = (By.XPATH, "//a[@href='/day/']")
    _day_view_locator = (By.ID, 'day-view')
    _week_view_locator = (By.ID, 'week-view')

    def launch(self):
        Base.launch(self)
        self.wait_for_element_displayed(*self._current_month_year_locator)

    @property
    def current_month_year(self):
        return self.marionette.find_element(*self._current_month_year_locator).text

    @property
    def current_month_day(self):
        return self.marionette.find_element(*self._current_months_day_locator).get_attribute('data-date')

    def tap_add_event_button(self):
        self.marionette.find_element(*self._add_event_button_locator).tap()
        self.wait_for_element_displayed(*self._event_title_input_locator)

        from gaiatest.apps.calendar.regions.event import NewEvent
        new_event = NewEvent(self.marionette)
        new_event.wait_for_panel_to_load()
        return new_event

    def click_week_display_button(self):
        self.marionette.find_element(*self._week_display_button_locator).tap()
        self.wait_for_element_displayed(*self._week_view_locator)

    def click_day_display_button(self):
        self.marionette.find_element(*self._day_display_button_locator).tap()
        self.wait_for_element_displayed(*self._day_view_locator)

    def displayed_events_in_month_view(self, date_time):
        return self.marionette.find_element(*self._get_events_locator_in_month_view(date_time)).text

    def displayed_events_in_week_view(self, date_time):
        return self.marionette.find_element(*self._get_events_locator_in_week_view(date_time)).text

    def displayed_events_in_day_view(self, date_time):
        return self.marionette.find_element(*self._get_events_locator_in_day_view(date_time)).text

    def _get_events_locator_in_day_view(self, date_time):
        time_slot = self._get_data_hour(date_time)
        data_date = self._get_data_date(date_time)
        return (By.CSS_SELECTOR,
                "#day-view section.active[data-date*='%s'] section.hour-%d" % (data_date, time_slot))

    def _get_events_locator_in_month_view(self, date_time):
        time_slot = self._get_data_hour(date_time)
        return (By.CSS_SELECTOR,
                '#event-list section.hour-%d div.events' % time_slot)

    def _get_events_locator_in_week_view(self, date_time):
        time_slot = self._get_data_hour(date_time)
        data_date = self._get_data_date(date_time)
        return (By.CSS_SELECTOR,
                "#week-view section.active[data-date*='%s'] ol.hour-%d" % (data_date, time_slot))

    def _get_this_event_locator(self, date_time):
        time_slot = self._get_data_hour(date_time)
        return By.CSS_SELECTOR, '#event-list section.hour-%d span.display-hour' % time_slot

    @staticmethod
    def _get_data_date(date_time):
        return date_time.strftime("%b %d")

    @staticmethod
    def _get_data_hour(date_time):
        return date_time.hour
