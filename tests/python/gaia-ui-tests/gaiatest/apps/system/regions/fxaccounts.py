# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base


class FirefoxAccount(Base):

    _email_field_locator = (By.ID, 'fxa-email-input')
    _next_locator = (By.ID, 'fxa-module-next')
    _password_locator = (By.ID, 'fxa-pw-input')
    _done_locator = (By.ID, 'fxa-module-done')
    _fxa_iframe_locator = (By.ID, 'fxa-iframe')
    _password_error_locator = (By.ID, 'fxa-error-overlay')
    _password_error_close_locator = (By.ID, 'fxa-error-ok')

    def _switch_to_fxa_iframe(self):
        self.marionette.switch_to_frame()
        iframe = Wait(self.marionette, timeout=60).until(
            expected.element_present(*self._fxa_iframe_locator))
        Wait(self.marionette).until(expected.element_displayed(iframe))
        Wait(self.marionette, timeout=60).until(lambda m: iframe.get_attribute('data-url') != 'about:blank')
        self.marionette.switch_to_frame(iframe)

    def enter_email(self, email=None):
        self._switch_to_fxa_iframe()

        input_field = Wait(self.marionette, timeout=60).until(
            expected.element_present(*self._email_field_locator))
        Wait(self.marionette).until(expected.element_displayed(input_field))
        input_field.send_keys(email)

        # Wait until the keyboard is completely displayed, otherwise tapping
        # the next button is unreliable
        self.marionette.switch_to_frame()
        Wait(self.marionette).until(lambda m: self.keyboard.is_keyboard_displayed)
        self._switch_to_fxa_iframe()
        self.marionette.find_element(*self._next_locator).tap()

    def enter_password(self, password=None):
        self._switch_to_fxa_iframe()
        input_field = Wait(self.marionette, timeout=60).until(
            expected.element_present(*self._password_locator))
        Wait(self.marionette).until(expected.element_displayed(input_field))
        input_field.send_keys(password)

        # Wait until the keyboard is completely displayed, otherwise tapping
        # the next button is unreliable
        self.marionette.switch_to_frame()
        Wait(self.marionette).until(lambda m: self.keyboard.is_keyboard_displayed)
        self._switch_to_fxa_iframe()
        self.marionette.find_element(*self._next_locator).tap()

    def wait_for_password_error(self):
        done = Wait(self.marionette, timeout=60).until(
            expected.element_present(*self._password_error_locator))
        Wait(self.marionette).until(expected.element_displayed(done))

    def close_password_error(self):
        self._switch_to_fxa_iframe()
        self.marionette.find_element(*self._password_error_close_locator).tap()

    def wait_for_successful_login(self):
        done = Wait(self.marionette, timeout = 60).until(
            expected.element_present(*self._done_locator))
        Wait(self.marionette).until(expected.element_displayed(done))
        return done

    def tap_done(self):
        self._switch_to_fxa_iframe()
        done = self.wait_for_successful_login()
        done.tap()
        #Switch back to the settings app
        self.apps.switch_to_displayed_app()
