# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.base import Base


class OutlookLogin(Base):

    _outlook_sign_in_frame_locator = (By.CSS_SELECTOR, '#frame-container > iframe[data-url*="live"]')
    _email_locator = (By.CSS_SELECTOR, '.contentHolder:nth-child(1) #i0116')
    _password_locator = (By.CSS_SELECTOR, '.contentHolder:nth-child(1) #i0118')
    _sign_in_locator = (By.CSS_SELECTOR, '.contentHolder:nth-child(1) #idSIButton9')

    def switch_to_outlook_login(self):
        self.marionette.switch_to_frame()
        outlook_sign_in = self.marionette.find_element(*self._outlook_sign_in_frame_locator)
        self.marionette.switch_to_frame(outlook_sign_in)

    def outlook_login(self, user, passwd):
        self.wait_for_element_displayed(*self._email_locator)
        self.marionette.find_element(*self._email_locator).tap()
        self.marionette.find_element(*self._email_locator).send_keys(user)
        self.marionette.find_element(*self._password_locator).tap()
        self.marionette.find_element(*self._password_locator).send_keys(passwd)
        self.marionette.find_element(*self._sign_in_locator).tap()
        from gaiatest.apps.contacts.app import Contacts
        return Contacts(self.marionette)
