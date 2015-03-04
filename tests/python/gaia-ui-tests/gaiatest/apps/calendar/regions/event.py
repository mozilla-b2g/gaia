# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from datetime import datetime

from marionette_driver import expected, By, Wait

from gaiatest.apps.calendar.app import Calendar


class NewEvent(Calendar):

    _modify_event_view_locator = (By.ID, 'modify-event-view')
    _modify_event_header_locator = (By.ID, 'modify-event-header')
    _event_title_input_locator = (By.XPATH, "//input[@data-l10n-id='event-title']")
    _event_location_input_locator = (By.XPATH, "//input[@data-l10n-id='event-location']")
    _event_start_time_value_locator = (By.ID, "start-time-locale")
    _event_start_date_value_locator = (By.ID, "start-date-locale")
    _edit_event_button_locator = (By.CSS_SELECTOR, 'button.edit')
    _save_event_button_locator = (By.CSS_SELECTOR, 'button.save')

    def wait_for_panel_to_load(self):
        Wait(self.marionette).until(expected.element_displayed(
            Wait(self.marionette).until(expected.element_present(
                *self._event_title_input_locator))))

    def a11y_fill_event_title(self, title):
        self.accessibility.click(self.marionette.find_element(*self._event_title_input_locator))
        self.keyboard.send(title)
        self.keyboard.dismiss()

    def fill_event_title(self, title):
        self.marionette.find_element(*self._event_title_input_locator).tap()
        self.keyboard.send(title)
        self.keyboard.dismiss()

    def a11y_fill_event_location(self, location):
        self.accessibility.click(self.marionette.find_element(*self._event_location_input_locator))
        self.keyboard.send(location)
        self.keyboard.dismiss()

    def fill_event_location(self, location):
        self.marionette.find_element(*self._event_location_input_locator).tap()
        self.keyboard.send(location)
        self.keyboard.dismiss()

    def a11y_click_close_button(self):
        self.marionette.execute_async_script(
            "Accessibility.click(arguments[0].shadowRoot.querySelector('button.action-button'));",
            [self.marionette.find_element(*self._modify_event_header_locator)], special_powers=True)

    def a11y_click_save_event(self):
        event_start_time = self.marionette.find_element(*self._event_start_time_value_locator).text
        event_start_date = self.marionette.find_element(*self._event_start_date_value_locator).text
        el = self.marionette.find_element(*self._modify_event_view_locator)
        self.accessibility.click(self.marionette.find_element(*self._save_event_button_locator))
        Wait(self.marionette).until(expected.element_not_displayed(el))
        return datetime.strptime(event_start_time + event_start_date, '%I:%M %p%m/%d/%Y')

    def tap_save_event(self):
        event_start_time = self.marionette.find_element(*self._event_start_time_value_locator).text
        event_start_date = self.marionette.find_element(*self._event_start_date_value_locator).text
        el = self.marionette.find_element(*self._modify_event_view_locator)
        self.marionette.find_element(*self._save_event_button_locator).tap()
        Wait(self.marionette).until(expected.element_not_displayed(el))
        return datetime.strptime(event_start_time + event_start_date, '%I:%M %p%m/%d/%Y')
