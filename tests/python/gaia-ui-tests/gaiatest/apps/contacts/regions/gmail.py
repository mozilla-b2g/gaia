# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.base import Base


class GmailLogin(Base):

    _gmail_sign_in_frame_locator = (By.CSS_SELECTOR, '#frame-container > iframe[data-url*="google"]')
    _email_locator = (By.ID, 'Email')
    _password_locator = (By.ID, 'Passwd')
    _sign_in_locator = (By.ID, 'signIn')
    _grant_access_button_locator = (By.ID, 'submit_approve_access')

    def switch_to_gmail_login_frame(self):
        self.marionette.switch_to_frame()
        gmail_sign_in = self.marionette.find_element(*self._gmail_sign_in_frame_locator)
        self.marionette.switch_to_frame(gmail_sign_in)

    def gmail_login(self, user, passwd):
        self.wait_for_element_displayed(*self._email_locator)
        self.marionette.find_element(*self._email_locator).tap()
        self.marionette.find_element(*self._email_locator).send_keys(user)
        self.marionette.find_element(*self._password_locator).tap()
        self.marionette.find_element(*self._password_locator).send_keys(passwd)
        self.marionette.find_element(*self._sign_in_locator).tap()

    def tap_grant_access(self):
        grant_access_button = self.marionette.find_element(*self._grant_access_button_locator)
        self.wait_for_condition(lambda m: grant_access_button.is_enabled())
        self.marionette.execute_script("arguments[0].scrollIntoView(false);", [grant_access_button])
        grant_access_button.tap()
        from gaiatest.apps.contacts.app import Contacts
        return Contacts(self.marionette)
