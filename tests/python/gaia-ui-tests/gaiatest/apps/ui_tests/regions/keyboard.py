# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.base import Base


class KeyboardPage(Base):
    _number_input_locator = (By.CSS_SELECTOR, 'input[type="number"]')
    _text_input_locator = (By.CSS_SELECTOR, 'input[type="text"]')
    _email_input_locator = (By.CSS_SELECTOR, 'input[type="email"]')
    _url_input_locator = (By.CSS_SELECTOR, 'input[type="url"]')
    _frame_locator = (By.CSS_SELECTOR, "#test-iframe[src*='keyboard']")

    def __init__(self, marionette):
        Base.__init__(self, marionette)

    def switch_to_frame(self):
        self.wait_for_element_displayed(*self._frame_locator)
        keyboard_page_iframe = self.marionette.find_element(*self._frame_locator)
        self.marionette.switch_to_frame(keyboard_page_iframe)

    def tap_number_input(self):
        self.marionette.find_element(*self._number_input_locator).tap()
        from gaiatest.apps.keyboard.app import Keyboard

        return Keyboard(self.marionette)

    @property
    def number_input(self):
        return self.marionette.find_element(*self._number_input_locator).get_attribute('value')

    def tap_text_input(self):
        self.marionette.find_element(*self._text_input_locator).tap()
        from gaiatest.apps.keyboard.app import Keyboard

        return Keyboard(self.marionette)

    @property
    def text_input(self):
        return self.marionette.find_element(*self._text_input_locator).get_attribute('value')

    def tap_email_input(self):
        self.marionette.find_element(*self._email_input_locator).tap()
        from gaiatest.apps.keyboard.app import Keyboard

        return Keyboard(self.marionette)

    @property
    def email_input(self):
        return self.marionette.find_element(*self._email_input_locator).get_attribute('value')

    def tap_url_input(self):
        self.marionette.find_element(*self._url_input_locator).tap()
        from gaiatest.apps.keyboard.app import Keyboard

        return Keyboard(self.marionette)

    @property
    def url_input(self):
        return self.marionette.find_element(*self._url_input_locator).get_attribute('value')
