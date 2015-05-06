# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait
from marionette_driver.errors import StaleElementException

from gaiatest.apps.base import Base


class Persona(Base):

    # iframes
    _persona_frame_locator = (By.CSS_SELECTOR, "iframe.screen[data-url*='persona.org/sign_in#NATIVE']")

    # persona login
    _email_input_locator = (By.ID, 'authentication_email')
    _password_input_locator = (By.ID, 'authentication_password')
    _continue_button_locator = (By.CSS_SELECTOR, '.continue.right')
    _returning_button_locator = (By.CSS_SELECTOR, 'button.isReturning')

    def __init__(self, marionette):
        Base.__init__(self, marionette)

    def login(self, email, password):
        # This only supports logging in with a known user and no existing session
        self.type_email(email)
        self.tap_continue()

        self.type_password(password)
        self.tap_returning()

        self.marionette.switch_to_frame()
        Wait(self.marionette).until(
            expected.element_not_present(*self._persona_frame_locator))
        self.apps.switch_to_displayed_app()

    def wait_for_persona_to_load(self):
        # Wait a bit more because it's an external resource that's loading
        # TODO - This repeatedly looks up the body element, presumably because
        # at some point it becomes stale. We should investigate a more
        # efficient wait.
        body_locator = (By.TAG_NAME, 'body')
        Wait(self.marionette, timeout=30, ignored_exceptions=StaleElementException).until(
            lambda m: m.find_element(*body_locator).is_displayed()
            and 'loading' not in m.find_element(*body_locator).get_attribute('class'))

    def switch_to_persona_frame(self):
        self.marionette.switch_to_frame()
        self.frame = Wait(self.marionette).until(
            expected.element_present(*self._persona_frame_locator))
        self.marionette.switch_to_frame(self.frame)
        self.wait_for_persona_to_load()

    def type_email(self, value):
        self.marionette.find_element(*self._email_input_locator).send_keys(value)
        self.keyboard.dismiss()
        self.switch_to_persona_frame()

    def type_password(self, value):
        self.marionette.find_element(*self._password_input_locator).send_keys(value)
        self.keyboard.dismiss()
        self.switch_to_persona_frame()

    def tap_continue(self):
        element = self.marionette.find_element(*self._continue_button_locator)
        element.tap()
        Wait(self.marionette).until(expected.element_not_displayed(element))
        Wait(self.marionette).until(expected.element_displayed(*self._password_input_locator))

    def tap_returning(self):
        self.marionette.find_element(*self._returning_button_locator).tap()
