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
    _sign_in_button_locator = (By.ID, 'signInButton')
    _this_session_only_button_locator = (By.ID, 'this_is_not_my_computer')
    _this_is_not_me_locator = (By.CSS_SELECTOR, 'p.isMobile a.thisIsNotMe')

    _create_password_locator = (By.ID, 'password')
    _confirm_password_locator = (By.ID, 'vpassword')
    _verify_user_locator = (By.ID, 'verify_user')

    _form_section_locator = (By.CSS_SELECTOR, 'div.vertical div.form_section')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        self.marionette.switch_to_frame()
        self.wait_for_element_present(*self._persona_frame_locator)

    def login(self, email, password):
        self.switch_to_persona_frame()

        # This is a hack until we are able to run test with a clean profile
        # if a user was logged in tap this is not me
        if self.form_section_id == "selectEmail":
            self.wait_for_sign_in_button()
            self.tap_this_is_not_me()

        self.wait_for_email_input()
        self.type_email(email)
        self.tap_continue()

        # if we login with an unverified user we have to confirm the password
        if self.form_section_id == "authentication_form":
            self.wait_for_password_input()
            self.type_password(password)
            self.tap_returning()
        elif self.form_section_id == "set_password":
            self.type_create_password(password)
            self.type_confirm_password(password)
            self.tap_verify_user()
        else:
            raise Exception('Could not log into Persona')

    def switch_to_persona_frame(self):
        self.wait_for_element_present(*self._persona_frame_locator)
        self.frame = self.marionette.find_element(*self._persona_frame_locator)
        self.marionette.switch_to_frame(self.frame)

        self.wait_for_element_not_present(*self._body_loading_locator)

    def type_email(self, value):
        email_field = self.marionette.find_element(*self._email_input_locator)
        email_field.send_keys(value)
        self.dismiss_keyboard()

    def type_password(self, value):
        password_field = self.marionette.find_element(*self._password_input_locator)
        password_field.send_keys(value)
        self.dismiss_keyboard()

    def type_create_password(self, value):
        password_field = self.marionette.find_element(*self._create_password_locator)
        password_field.send_keys(value)

    def type_confirm_password(self, value):
        password_field = self.marionette.find_element(*self._confirm_password_locator)
        password_field.send_keys(value)

    def tap_continue(self):
        continue_button = self.marionette.find_element(*self._continue_button_locator)
        self.wait_for_element_displayed(*self._continue_button_locator)
        continue_button.tap()
        self.wait_for_element_not_displayed(*self._continue_button_locator)

    def tap_verify_user(self):
        self.marionette.find_element(*self._verify_user_locator).tap()

    def tap_sign_in(self):
        self.marionette.find_element(*self._sign_in_button_locator).tap()

    def tap_this_is_not_me(self):
        self.marionette.find_element(*self._this_is_not_me_locator).tap()

    def tap_returning(self):
        self.marionette.find_element(*self._returning_button_locator).tap()

    def tap_this_session_only(self):
        self.marionette.find_element(*self._this_session_only_button_locator).tap()

    @property
    def form_section_id(self):
        self.wait_for_element_displayed(*self._form_section_locator)
        return self.marionette.find_element(*self._form_section_locator).get_attribute('id')

    def wait_for_sign_in_button(self):
        self.wait_for_element_displayed(*self._sign_in_button_locator)

    def wait_for_email_input(self):
        self.wait_for_element_displayed(*self._email_input_locator)

    def wait_for_password_input(self):
        self.wait_for_element_displayed(*self._password_input_locator)
