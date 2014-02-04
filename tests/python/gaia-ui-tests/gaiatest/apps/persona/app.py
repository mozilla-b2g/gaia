# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.base import Base


class Persona(Base):

    # iframes
    _persona_frame_locator = (By.CSS_SELECTOR, "iframe.screen[data-url*='persona.org/sign_in#NATIVE']")

    # persona login
    _body_loading_locator = (By.CSS_SELECTOR, 'body.loading')
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
        self.wait_for_element_not_present(*self._persona_frame_locator)
        self.apps.switch_to_displayed_app()

    def wait_for_persona_to_load(self):
        self.wait_for_element_not_displayed(*self._body_loading_locator)

    def switch_to_persona_frame(self):
        self.marionette.switch_to_frame()
        self.frame = self.wait_for_element_present(*self._persona_frame_locator)
        self.marionette.switch_to_frame(self.frame)
        self.wait_for_persona_to_load()

    def type_email(self, value):
        self.marionette.find_element(*self._email_input_locator).send_keys(value)

    def type_password(self, value):
        self.marionette.find_element(*self._password_input_locator).send_keys(value)

    def tap_continue(self):
        self.marionette.find_element(*self._continue_button_locator).tap()
        self.wait_for_element_not_displayed(*self._continue_button_locator)
        self.wait_for_element_displayed(*self._password_input_locator)

    def tap_returning(self):
        self.marionette.find_element(*self._returning_button_locator).tap()
