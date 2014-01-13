# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By

from gaiatest.apps.base import Base


class AuthenticationDialog(Base):

    _auth_dialog_locator = (By.ID, 'http-authentication-dialog')

    _username_input_locator = (By.ID, 'http-authentication-username')
    _password_input_locator = (By.ID, 'http-authentication-password')
    _sign_in_button_locator = (By.ID, 'http-authentication-ok')

    def type_username(self, text):
        username_input = self.marionette.find_element(*self._username_input_locator)
        username_input.send_keys(text)

    def type_password(self, text):
        username_input = self.marionette.find_element(*self._password_input_locator)
        username_input.send_keys(text)

    def authenticate(self, username, password):
        self.wait_for_element_displayed(*self._auth_dialog_locator)
        self.type_username(username)
        self.type_password(password)

        sign_in_button = self.marionette.find_element(*self._sign_in_button_locator)
        sign_in_button.tap()
