# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait
from marionette_driver.errors import (NoSuchElementException,
                                      StaleElementException)
from marionette_driver.marionette import Actions

from gaiatest.apps.base import Base
from gaiatest.apps.base import PageRegion
from gaiatest.apps.calendar.regions.event_details import EventDetails


class Calendar(Base):

    name = 'Calendar'

    _current_month_year_locator = (By.ID, 'current-month-year')
    _current_month_day_agenda_locator = (By.ID, 'month-day-agenda')
    _current_monthly_calendar_locator = (By.ID, 'month-view')
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

    _create_account_button_locator = (By.CLASS_NAME, 'create-account')
    _create_account_header_locator = (By.ID, 'create-account-header')
    _create_account_view_locator = (By.ID, 'create-account-view')
    _create_account_preset_locator = (By.CSS_SELECTOR,
                                      '#create-account-presets a')

    _modify_account_header_locator = (By.ID, 'modify-account-header')
    _modify_account_view_locator = (By.ID, 'modify-account-view')

    _settings_locator = (By.ID, 'settings')

    _advanced_settings_view_locator = (By.ID, 'advanced-settings-view')
    _advanced_settings_done_button_locator = (By.XPATH, "//a[@href='/settings/']")

    _event_list_date_locator = (By.ID, 'event-list-date')
    _event_list_empty_locator = (By.ID, 'empty-message')
    _event_locator = (By.CLASS_NAME, 'event')
    _today_locator = (By.CSS_SELECTOR, '.month.active .present')
    _tomorrow_locator = (By.CSS_SELECTOR, '.month.active .present + li > .day')

    _day_view_all_day_button = (By.CSS_SELECTOR,
                                '.day-view .md__allday:nth-child(2) .md__allday-events')
    _day_view_event_link = (By.CSS_SELECTOR, '.day-view .md__day:nth-child(2) .md__event')

    def launch(self):
        Base.launch(self)
        # empty message is only displayed after first MonthsDay#render,
        # so we are sure app is "ready" after that
        Wait(self.marionette).until(expected.element_displayed(
            Wait(self.marionette).until(expected.element_present(
                *self._event_list_empty_locator))))

    @property
    def current_month_year(self):
        return self.marionette.find_element(*self._current_month_year_locator).text

    @property
    def current_month_day(self):
        return self.marionette.find_element(*self._current_month_day_agenda_locator).get_attribute('data-date')

    @property
    def event_list_date(self):
        return self.marionette.find_element(*self._event_list_date_locator).text

    @property
    def events(self):
        return [self.Event(marionette=self.marionette, element=event)
                for event in self.marionette.find_elements(*self._event_locator)]

    def wait_for_events(self, number_to_wait_for=1):
        Wait(self.marionette).until(lambda m: len(m.find_elements(*self._event_locator)) == number_to_wait_for)

    def event(self, title):
        for event in self.events:
            if event.title == title:
                return event

    @property
    def accounts(self):
        return [account for account in self.marionette.find_elements(
            *self._create_account_preset_locator)]

    def account(self, preset):
        for account in self.accounts:
            if account.get_attribute('data-provider') == preset:
                return account

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
        Wait(self.marionette).until(expected.element_displayed(
            Wait(self.marionette).until(expected.element_present(
                *self._week_view_locator))))

    def tap_week_display_button(self):
        self.marionette.find_element(*self._week_display_button_locator).tap()
        Wait(self.marionette).until(expected.element_displayed(
            Wait(self.marionette).until(expected.element_present(
                *self._week_view_locator))))

    def a11y_click_month_display_button(self):
        self.accessibility.click(self.marionette.find_element(*self._month_display_button_locator))
        Wait(self.marionette).until(expected.element_displayed(
            Wait(self.marionette).until(expected.element_present(
                *self._current_monthly_calendar_locator))))
        Wait(self.marionette).until(expected.element_displayed(
            Wait(self.marionette).until(expected.element_present(
                *self._current_month_day_agenda_locator))))

    def a11y_click_day_display_button(self):
        self.accessibility.click(self.marionette.find_element(*self._day_display_button_locator))
        Wait(self.marionette).until(expected.element_displayed(
            Wait(self.marionette).until(expected.element_present(
                *self._day_view_locator))))

    def tap_day_display_button(self):
        self.marionette.find_element(*self._day_display_button_locator).tap()
        Wait(self.marionette).until(expected.element_displayed(
            Wait(self.marionette).until(expected.element_present(
                *self._day_view_locator))))

    def displayed_events_in_month_view(self, date_time):
        return self.marionette.find_element(*self._get_events_locator_in_month_view()).text

    def displayed_events_in_week_view(self, date_time):
        return self.marionette.find_element(*self._get_events_locator_in_week_view(date_time)).text

    def displayed_events_in_day_view(self, date_time):
        return self.marionette.find_element(*self._get_events_locator_in_day_view(date_time)).text

    def _get_events_locator_in_day_view(self, date_time):
        data_date = self._get_data_date(date_time)
        return (By.CSS_SELECTOR,
                "#day-view .md__day[data-date*='%s'] .md__event" % data_date)

    def _get_events_locator_in_month_view(self):
        return (By.CSS_SELECTOR,
                '#event-list .event')

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
        self.accessibility.execute_async_script(
            "Accessibility.click(arguments[0].shadowRoot.querySelector('%s'));" % selector,
            [header])

    def wait_fot_settings_drawer_animation(self):
        el = self.marionette.find_element(*self.settings._settings_drawer_locator)
        Wait(self.marionette).until(lambda m: el.get_attribute('data-animstate') == 'done')

    def a11y_click_create_account_back(self):
        self.a11y_click_header(self.marionette.find_element(*self._create_account_header_locator),
                               'button.action-button')
        Wait(self.marionette).until(expected.element_displayed(
            Wait(self.marionette).until(expected.element_present(
                *self._advanced_settings_view_locator))))

    def a11y_click_modify_account_back(self):
        self.a11y_click_header(self.marionette.find_element(*self._modify_account_header_locator),
                               'button.action-button')
        Wait(self.marionette).until(expected.element_displayed(
            Wait(self.marionette).until(expected.element_present(
                *self._create_account_view_locator))))

    def a11y_click_settings(self):
        self.a11y_click_header(self.marionette.find_element(*self._time_header_locator),
                               'button.action-button')
        self.wait_fot_settings_drawer_animation()

    def a11y_click_close_settings(self):
        self.a11y_click_header(self.marionette.find_element(
            *self.settings._settings_header_locator), 'button.action-button')
        self.wait_fot_settings_drawer_animation()

    def a11y_create_event(self, title):
        new_event = self.a11y_click_add_event_button()
        # create a new event
        new_event.a11y_fill_event_title(title)
        new_event.a11y_click_save_event()
        self.wait_for_events(1)

    def a11y_click_day_view_event(self):
        self.accessibility.click(self.marionette.find_element(*self._day_view_event_link))
        el = self.marionette.find_element(*self._event_view_locator)
        Wait(self.marionette).until(expected.element_displayed(el))
        return EventDetails(self.marionette)

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

        Wait(self.marionette).until(lambda m: self.current_month_year != month_year)

    class Settings(PageRegion):

        _calendar_local_locator = (By.CSS_SELECTOR, '#calendar-local-first .pack-checkbox')
        _calendar_local_checkbox_locator = (By.CSS_SELECTOR,
                                            '#calendar-local-first input[type="checkbox"]')
        _advanced_settings_button_locator = (By.CSS_SELECTOR, '.settings')
        _settings_header_locator = (By.ID, 'settings-header')
        _settings_drawer_locator = (By.CLASS_NAME, 'settings-drawer')

        def wait_for_calendar_unchecked(self, timeout=None):
            checkbox = self.marionette.find_element(*self._calendar_local_checkbox_locator)
            Wait(self.marionette, timeout).until(expected.element_not_selected(checkbox))

        def wait_for_a11y_calendar_unchecked(self, timeout=None):
            Wait(self.marionette, timeout, ignored_exceptions=StaleElementException).until(
                lambda m: not self.marionette.find_element(
                    *self._calendar_local_locator).get_attribute('aria-selected'))

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
            el = self.marionette.find_element(*self._event_view_locator)
            Wait(self.marionette).until(expected.element_displayed(el))
            return EventDetails(self.marionette)
