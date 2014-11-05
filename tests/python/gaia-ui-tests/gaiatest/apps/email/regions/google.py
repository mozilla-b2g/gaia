# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.base import Base


class GoogleLogin(Base):
    _iframe_locator = (By.CSS_SELECTOR, "iframe.sup-oauth2-browser[src *= 'google']")
    _email_locator = (By.ID, 'Email')
    _password_locator = (By.ID, 'Passwd')
    _sign_in_locator = (By.ID, 'signIn')
    _approve_access_locator = (By.CSS_SELECTOR, '#submit_approve_access.goog-buttonset-action')

    def __init__(self, marionette):
        Base.__init__(self, marionette)

        # wait for the pop up screen to open
        view = self.wait_for_element_present(*self._iframe_locator)
        self.marionette.switch_to_frame(view)

        # wait for the page to load
        email = self.wait_for_element_present(*self._email_locator)
        self.wait_for_condition(lambda m: email.get_attribute('value') != '')

    @property
    def email(self):
        return self.marionette.find_element(*self._email_locator).get_attribute('value')

    def type_password(self, password):
        self.marionette.find_element(*self._password_locator).send_keys(password)

    def tap_sign_in(self):
        self.marionette.find_element(*self._sign_in_locator).tap()

    def wait_for_approve_access(self):
        self.wait_for_element_displayed(*self._approve_access_locator)

    def tap_approve_access(self):
        self.wait_for_condition(lambda m: self.marionette.find_element(*self._approve_access_locator).is_enabled())
        self.marionette.find_element(*self._approve_access_locator).tap()
