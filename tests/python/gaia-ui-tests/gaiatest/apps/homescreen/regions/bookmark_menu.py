# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.base import Base


class BookmarkMenu(Base):

    # System app - add bookmark to homescreen dialog
    _add_bookmark_to_home_screen_frame_locator = (By.CSS_SELECTOR, 'iframe[src^="app://homescreen"][src$="save-bookmark.html"]')
    _add_bookmark_to_home_screen_dialog_button_locator = (By.ID, 'button-bookmark-add')
    _bookmark_title_input_locator = (By.ID, 'bookmark-title')

    def tap_add_bookmark_to_home_screen_dialog_button(self):
        self.wait_for_element_displayed(*self._add_bookmark_to_home_screen_dialog_button_locator)
        self.marionette.find_element(*self._add_bookmark_to_home_screen_dialog_button_locator).tap()

        # Wait for the Add to bookmark frame to be dismissed
        self.marionette.switch_to_frame()
        self.wait_for_element_not_present(*self._add_bookmark_to_home_screen_frame_locator)

    def type_bookmark_title(self, value):
        element = self.marionette.find_element(*self._bookmark_title_input_locator)
        element.clear()
        self.keyboard.send(value)
        self.keyboard.dismiss()
        self.switch_to_add_bookmark_frame()

    def switch_to_add_bookmark_frame(self):
        # Switch to System app where the add bookmark dialog resides
        self.marionette.switch_to_frame()
        self.wait_for_element_displayed(*self._add_bookmark_to_home_screen_frame_locator)
        self.frame = self.marionette.find_element(*self._add_bookmark_to_home_screen_frame_locator)
        self.marionette.switch_to_frame(self.frame)
        self.wait_for_element_displayed(*self._bookmark_title_input_locator)
