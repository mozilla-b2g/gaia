# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.calendar.app import Calendar


class NewEvent(Calendar):

    _modify_event_view_locator = (By.ID, 'modify-event-view')
    _event_title_input_locator = (By.XPATH, "//input[@data-l10n-id='event-title']")
    _event_location_input_locator = (By.XPATH, "//input[@data-l10n-id='event-location']")
    _edit_event_button_locator = (By.CSS_SELECTOR, 'button.edit')
    _save_event_button_locator = (By.CSS_SELECTOR, 'button.save')

    def wait_for_panel_to_load(self):
        self.wait_for_element_displayed(*self._event_title_input_locator)

    def fill_event_title(self, title):
        self.marionette.find_element(*self._event_title_input_locator).tap()
        self.keyboard.send(title)
        self.keyboard.dismiss()

    def fill_event_location(self, location):
        self.marionette.find_element(*self._event_location_input_locator).tap()
        self.keyboard.send(location)
        self.keyboard.dismiss()

    def tap_save_event(self):
        self.marionette.find_element(*self._save_event_button_locator).tap()
        self.wait_for_element_not_displayed(*self._modify_event_view_locator)
