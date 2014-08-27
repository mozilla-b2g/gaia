# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.base import Base


class BookmarkMenu(Base):

    name = "Bookmark"

    # System app - add bookmark to homescreen dialog
    _add_bookmark_to_home_screen_frame_locator = (By.CSS_SELECTOR, 'iframe[src^="app://bookmark"][src$="save.html"]')
    _add_bookmark_to_home_screen_dialog_button_locator = (By.ID, 'add-button')
    _bookmark_title_input_locator = (By.ID, 'bookmark-title')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        self.wait_for_condition(lambda m: self.apps.displayed_app.name == self.name)
        self.apps.switch_to_displayed_app()

    def tap_add_bookmark_to_home_screen_dialog_button(self):
        self.wait_for_element_displayed(*self._add_bookmark_to_home_screen_dialog_button_locator)
        self.marionette.find_element(*self._add_bookmark_to_home_screen_dialog_button_locator).tap()

        # Wait for the Add to bookmark frame to be dismissed
        self.wait_for_condition(lambda m: self.apps.displayed_app.name != self.name)
        self.apps.switch_to_displayed_app()

    def type_bookmark_title(self, value):
        element = self.marionette.find_element(*self._bookmark_title_input_locator)

        # Wait for the default value to load into the input field
        self.wait_for_condition(lambda m: element.get_attribute('value') != "")
        element.clear()
        self.keyboard.send(value)
        self.keyboard.dismiss()
