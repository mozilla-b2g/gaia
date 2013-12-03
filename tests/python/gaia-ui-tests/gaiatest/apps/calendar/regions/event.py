# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.calendar.app import Calendar


class NewEvent(Calendar):

    _event_title_input_locator = (By.XPATH, "//input[@data-l10n-id='event-title']")
    _event_location_input_locator = (By.XPATH, "//input[@data-l10n-id='event-location']")
    _edit_event_button_locator = (By.CSS_SELECTOR, 'button.edit')
    _save_event_button_locator = (By.CSS_SELECTOR, 'button.save')

    def wait_for_panel_to_load(self):
        self.wait_for_element_displayed(*self._event_title_input_locator)

    def fill_event_title(self, title):
        event_title_input = self.marionette.find_element(*self._event_title_input_locator)
        event_title_input.clear()
        event_title_input.send_keys(title)

    def fill_event_location(self, location):
        event_location_input = self.marionette.find_element(*self._event_location_input_locator)
        event_location_input.clear()
        event_location_input.send_keys(location)

    def tap_save_event(self):
        self.marionette.find_element(*self._save_event_button_locator).tap()
        self.wait_for_element_not_displayed(*self._save_event_button_locator)
