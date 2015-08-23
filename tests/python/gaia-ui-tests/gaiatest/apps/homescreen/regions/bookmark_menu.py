# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base


class BookmarkMenu(Base):

    name = "Bookmark"

    # System app - add bookmark to homescreen dialog
    _add_bookmark_to_home_screen_frame_locator = (By.CSS_SELECTOR, 'iframe[src^="app://bookmark"][src$="save.html"]')
    _add_bookmark_to_home_screen_dialog_button_locator = (By.ID, 'done-button')
    _bookmark_title_input_locator = (By.ID, 'bookmark-title')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        Wait(self.marionette).until(lambda m: self.apps.displayed_app.name == self.name)
        self.apps.switch_to_displayed_app()

    def tap_add_bookmark_to_home_screen_dialog_button(self):
        element = Wait(self.marionette).until(expected.element_present(
            *self._add_bookmark_to_home_screen_dialog_button_locator))
        Wait(self.marionette).until(expected.element_displayed(element))
        # This sleep is necessary for the button to react to the tap call
        time.sleep(0.2)
        self.tap_element_from_system_app(element)

        # Wait for the Add to bookmark frame to be dismissed
        Wait(self.marionette).until(lambda m: self.apps.displayed_app.name != self.name)
        self.apps.switch_to_displayed_app()

    def type_bookmark_title(self, value):
        element = self.marionette.find_element(
            *self._bookmark_title_input_locator)

        # Wait for the default value to load into the input field
        Wait(self.marionette).until(lambda m: element.get_attribute('value') != '')
        element.clear()

        self.keyboard.send(value)
        self.keyboard.dismiss()
