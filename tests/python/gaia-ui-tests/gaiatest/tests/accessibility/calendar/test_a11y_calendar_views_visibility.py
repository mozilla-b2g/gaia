# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.calendar.app import Calendar


class TestCalendarViewsVisibilityAccessibility(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

        self.calendar = Calendar(self.marionette)
        self.calendar.launch()

        self.views = {
            'time_views': self.marionette.find_element(*self.calendar._time_views_locator),
            'current_day': self.marionette.find_element(
                *self.calendar._current_month_day_agenda_locator),
            'month': self.marionette.find_element(
                *self.calendar._current_monthly_calendar_locator),
            'day': self.marionette.find_element(*self.calendar._day_view_locator),
            'week': self.marionette.find_element(*self.calendar._week_view_locator),
            'settings': self.marionette.find_element(*self.calendar._settings_locator),
            'advanced_settings': self.marionette.find_element(
                *self.calendar._advanced_settings_view_locator),
            'modify_event': self.marionette.find_element(*self.calendar._modify_event_view_locator),
            'event': self.marionette.find_element(*self.calendar._event_view_locator),
            'create_account': self.marionette.find_element(
                *self.calendar._create_account_view_locator),
            'modify_account': self.marionette.find_element(
                *self.calendar._modify_account_view_locator)
        }

        self.event_title = 'title'
        self.calendar.a11y_create_event(self.event_title)

    def test_a11y_calendar_views_visibility(self):

        def test_a11y_visible(*visible):
            for key, view in self.views.iteritems():
                if key in visible:
                    self.assertTrue(self.accessibility.is_visible(view))
                else:
                    self.assertTrue(self.accessibility.is_hidden(view))

        # Default
        test_a11y_visible('time_views', 'current_day', 'month')

        # Settings
        self.calendar.a11y_click_settings()
        test_a11y_visible('settings')

        # Advanced settings
        self.accessibility.click(self.marionette.find_element(
            *self.calendar.settings._advanced_settings_button_locator))
        test_a11y_visible('advanced_settings')

        # Create account
        self.accessibility.click(self.marionette.find_element(
            *self.calendar._create_account_button_locator))
        test_a11y_visible('create_account')

        # Modify account
        self.accessibility.click(self.calendar.account('caldav'))
        test_a11y_visible('modify_account')

        # Create account
        self.calendar.a11y_click_modify_account_back()
        test_a11y_visible('create_account')

        # Advanced settings
        self.calendar.a11y_click_create_account_back()
        test_a11y_visible('advanced_settings')

        # Settings
        self.accessibility.click(self.marionette.find_element(
            *self.calendar._advanced_settings_done_button_locator))
        test_a11y_visible('settings')

        # Default
        self.calendar.a11y_click_close_settings()
        test_a11y_visible('time_views', 'current_day', 'month')

        # Week
        self.calendar.a11y_click_week_display_button()
        test_a11y_visible('time_views', 'week')

        # Day
        self.calendar.a11y_click_day_display_button()
        test_a11y_visible('time_views', 'day')

        # Month
        self.calendar.a11y_click_month_display_button()
        test_a11y_visible('time_views', 'current_day', 'month')

        # New event
        new_event = self.calendar.a11y_click_add_event_button()
        test_a11y_visible('modify_event')

        # Month
        new_event.a11y_click_close_button()
        test_a11y_visible('time_views', 'current_day', 'month')

        # View event
        event = self.calendar.event(self.event_title)
        event.a11y_click()
        test_a11y_visible('event')
