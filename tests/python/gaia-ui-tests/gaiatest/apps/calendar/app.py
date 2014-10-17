# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from marionette.marionette import Actions
from gaiatest.apps.base import Base
from gaiatest.apps.base import PageRegion


class Calendar(Base):

    name = 'Calendar'

    _current_month_year_locator = (By.ID, 'current-month-year')
    _current_months_day_locator = (By.ID, 'months-day-view')
    _current_monthly_calendar_locator = (By.ID, 'month-view')
    _hint_swipe_to_navigate_locator = (By.ID, 'hint-swipe-to-navigate')
    _add_event_button_locator = (By.XPATH, "//a[@href='/event/add/']")

    _month_display_button_locator = (By.XPATH, "//a[@href='/month/']")
    _week_display_button_locator = (By.XPATH, "//a[@href='/week/']")
    _day_display_button_locator = (By.XPATH, "//a[@href='/day/']")
    _day_view_locator = (By.ID, 'day-view')
    _week_view_locator = (By.ID, 'week-view')

    _time_views_locator = (By.ID, 'time-views')
    _modify_event_view_locator = (By.ID, 'modify-event-view')
    _event_view_locator = (By.ID, 'event-view')
    _time_header_locator = (By.ID, 'time-header')

    _settings_locator = (By.ID, 'settings')

    _advanced_settings_view_locator = (By.ID, 'advanced-settings-view')
    _advanced_settings_done_button_locator = (By.XPATH, "//a[@href='/settings/']")

    _event_list_date_locator = (By.ID, 'event-list-date')
    _event_locator = (By.CLASS_NAME, 'event')
    _today_locator = (By.CLASS_NAME, 'present')
    _tomorrow_locator = (By.CSS_SELECTOR, '.present + li > .day')

    def launch(self):
        Base.launch(self)
        self.wait_for_element_displayed(*self._hint_swipe_to_navigate_locator)
        self.marionette.find_element(*self._hint_swipe_to_navigate_locator).tap()
        self.wait_for_element_not_displayed(*self._hint_swipe_to_navigate_locator)

    @property
    def current_month_year(self):
        return self.marionette.find_element(*self._current_month_year_locator).text

    @property
    def current_month_day(self):
        return self.marionette.find_element(*self._current_months_day_locator).get_attribute('data-date')

    @property
    def event_list_date(self):
        return self.marionette.find_element(*self._event_list_date_locator).text

    @property
    def events(self):
        return [self.Event(marionette=self.marionette, element=event)
                for event in self.marionette.find_elements(*self._event_locator)]

    def wait_for_events(self, number_to_wait_for=1):
        self.wait_for_condition(
            lambda m: len(m.find_elements(*self._event_locator)) == number_to_wait_for)

    def event(self, title):
        for event in self.events:
            if event.title == title:
                return event

    @property
    def settings(self):
        return self.Settings(marionette=self.marionette,
                             element=self.marionette.find_elements(*self._settings_locator))

    def wait_for_new_event(self):
        from gaiatest.apps.calendar.regions.event import NewEvent
        new_event = NewEvent(self.marionette)
        new_event.wait_for_panel_to_load()
        return new_event

    def a11y_click_add_event_button(self):
        self.accessibility.click(self.marionette.find_element(*self._add_event_button_locator))
        return self.wait_for_new_event()

    def tap_add_event_button(self):
        self.marionette.find_element(*self._add_event_button_locator).tap()
        return self.wait_for_new_event()

    def a11y_click_week_display_button(self):
        self.accessibility.click(self.marionette.find_element(*self._week_display_button_locator))
        self.wait_for_element_displayed(*self._week_view_locator)

    def tap_week_display_button(self):
        self.marionette.find_element(*self._week_display_button_locator).tap()
        self.wait_for_element_displayed(*self._week_view_locator)

    def a11y_click_month_display_button(self):
        self.accessibility.click(self.marionette.find_element(*self._month_display_button_locator))
        self.wait_for_element_displayed(*self._current_monthly_calendar_locator)
        self.wait_for_element_displayed(*self._current_months_day_locator)

    def a11y_click_day_display_button(self):
        self.accessibility.click(self.marionette.find_element(*self._day_display_button_locator))
        self.wait_for_element_displayed(*self._day_view_locator)

    def tap_day_display_button(self):
        self.marionette.find_element(*self._day_display_button_locator).tap()
        self.wait_for_element_displayed(*self._day_view_locator)

    def displayed_events_in_month_view(self, date_time):
        return self.marionette.find_element(*self._get_events_locator_in_month_view(date_time)).text

    def displayed_events_in_week_view(self, date_time):
        return self.marionette.find_element(*self._get_events_locator_in_week_view(date_time)).text

    def displayed_events_in_day_view(self, date_time):
        return self.marionette.find_element(*self._get_events_locator_in_day_view(date_time)).text

    def _get_events_locator_in_day_view(self, date_time):
        data_date = self._get_data_date(date_time)
        return (By.CSS_SELECTOR,
                "#day-view .md__day[data-date*='%s'] .md__event" % data_date)

    def _get_events_locator_in_month_view(self, date_time):
        time_slot = self._get_data_hour(date_time)
        return (By.CSS_SELECTOR,
                '#event-list section.hour-%d div.events' % time_slot)

    def _get_events_locator_in_week_view(self, date_time):
        data_date = self._get_data_date(date_time)
        return (By.CSS_SELECTOR,
                "#week-view .md__day[data-date*='%s'] .md__event" % data_date)

    @staticmethod
    def _get_data_date(date_time):
        return date_time.strftime("%b %d")

    @staticmethod
    def _get_data_hour(date_time):
        return date_time.hour

    def a11y_click_other_day(self, next, previous):
        try:
            # Try clicking tomorrow
            self.accessibility.click(self.marionette.find_element(*self._tomorrow_locator))
            return next
        except NoSuchElementException:
            # Tomorrow is next week or month, try clicking yesterday.
            yesterday = self.marionette.execute_script(
                "return arguments[0].previousSibling.querySelector('.day');",
                [self.marionette.find_element(*self._today_locator)])
            self.accessibility.click(yesterday)
            return previous

    def a11y_click_header(self, header, selector):
        self.marionette.execute_async_script(
            "Accessibility.click(arguments[0].shadowRoot.querySelector('%s'));" % selector,
            [header], special_powers=True)

    def wait_fot_settings_drawer_animation(self):
        self.wait_for_condition(
            lambda m: m.find_element(
                *self.settings._settings_drawer_locator).get_attribute('data-animstate') == 'done')

    def a11y_click_settings(self):
        self.a11y_click_header(self.marionette.find_element(*self._time_header_locator),
                               'button.icon-menu')
        self.wait_fot_settings_drawer_animation()

    def a11y_click_close_settings(self):
        self.a11y_click_header(self.marionette.find_element(
            *self.settings._settings_header_locator), 'button.icon-menu')
        self.wait_fot_settings_drawer_animation()

    def flick_to_next_month(self):
        self._flick_to_month('next')

    def flick_to_previous_month(self):
        self._flick_to_month('previous')

    def a11y_wheel_to_next_month(self):
        self._a11y_wheel_to_month('left')

    def a11y_wheel_to_previous_month(self):
        self._a11y_wheel_to_month('right')

    def _a11y_wheel_to_month(self, direction):
        self.accessibility.wheel(self.marionette.find_element(
            *self._current_monthly_calendar_locator), direction)

    def _flick_to_month(self, direction):
        """Flick current monthly calendar to next or previous month.

        @param direction: flick to next month if direction='next', else flick to previous month
        """
        action = Actions(self.marionette)

        month = self.marionette.find_element(
            *self._current_monthly_calendar_locator)
        month_year = self.current_month_year

        x_start = (month.size['width'] / 100) * (direction == 'next' and 90 or 10)
        x_end = (month.size['width'] / 100) * (direction == 'next' and 10 or 90)
        y_start = month.size['height'] / 4
        y_end = month.size['height'] / 4

        action.flick(month, x_start, y_start, x_end, y_end, 200).perform()

        self.wait_for_condition(
            lambda m: self.current_month_year != month_year)

    class Settings(PageRegion):

        _calendar_local_locator = (By.CSS_SELECTOR, '#calendar-local-first .pack-checkbox')
        _calendar_local_checkbox_locator = (By.CSS_SELECTOR,
                                            '#calendar-local-first input[type="checkbox"]')
        _advanced_settings_button_locator = (By.CSS_SELECTOR, '.settings')
        _settings_header_locator = (By.ID, 'settings-header')
        _settings_drawer_locator = (By.CLASS_NAME, 'settings-drawer')

    class Event(PageRegion):

        _title_locator = (By.TAG_NAME, 'h5')
        _location_locator = (By.CLASS_NAME, 'location')
        _event_view_locator = (By.ID, 'event-view')

        @property
        def title(self):
            return self.root_element.find_element(*self._title_locator).text

        @property
        def location(self):
            return self.root_element.find_element(*self._location_locator).text

        def a11y_click(self):
            self.accessibility.click(self.root_element)
            self.wait_for_condition(lambda m: self.marionette.find_element(
                *self._event_view_locator).is_displayed())
            from gaiatest.apps.calendar.regions.event_details import EventDetails
            return EventDetails(self.marionette)
