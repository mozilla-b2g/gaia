# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

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
        frame = Wait(self.marionette).until(
            expected.element_present(*self._frame_locator))
        Wait(self.marionette).until(expected.element_displayed(frame))
        self.marionette.switch_to_frame(frame)

    def tap_number_input(self):
        number_input = self.marionette.find_element(*self._number_input_locator)
        self.marionette.execute_script("arguments[0].scrollIntoView(false);", [number_input])
        number_input.tap()
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
