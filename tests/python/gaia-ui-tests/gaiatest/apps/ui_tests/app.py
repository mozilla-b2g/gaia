# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
from marionette.by import By
from gaiatest.apps.base import Base


UI_TESTS = "UI Tests"


class UiTests(Base):

    _keyboard_locator = (By.CSS_SELECTOR, '#test-list > li:nth-child(2) > a')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        self.name = UI_TESTS

    def launch(self):
        Base.launch(self, launch_timeout=120000)

    def tap_keyboard_option(self):
        self.marionette.find_element(*self._keyboard_locator).tap()

    def switch_to_keyboard_page_frame(self):
        keyboard_page_iframe = self.marionette.find_element(By.CSS_SELECTOR, "#test-iframe[src*='keyboard']")
        self.marionette.switch_to_frame(keyboard_page_iframe)
        return KeyboardPage(self.marionette)


class KeyboardPage(Base):

    _keyboard_iframe_locator = (By.CSS_SELECTOR, "#test-iframe[src*='keyboard']")
    _number_input_locator =(By.CSS_SELECTOR, 'li:nth-child(4) > input')

    def tap_number_input(self):
        self.marionette.find_element(*self._number_input_locator).tap()
        from gaiatest.apps.keyboard.app import Keyboard
        return Keyboard(self.marionette)

    @property
    def number_input(self):
        return self.marionette.find_element(*self._number_input_locator).get_attribute('value')
