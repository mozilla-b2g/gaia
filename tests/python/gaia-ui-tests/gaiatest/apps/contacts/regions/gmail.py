# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait
from gaiatest.apps.base import Base


class GmailLogin(Base):

    _gmail_sign_in_frame_locator = (By.CSS_SELECTOR, '.popupWindow.active iframe[data-url*="google"]')
    _email_locator = (By.ID, 'Email')
    _password_locator = (By.ID, 'Passwd')
    _sign_in_locator = (By.ID, 'signIn')
    _grant_access_button_locator = (By.ID, 'submit_approve_access')

    def switch_to_gmail_login_frame(self):
        self.marionette.switch_to_frame()
        gmail_sign_in = self.marionette.find_element(*self._gmail_sign_in_frame_locator)
        self.marionette.switch_to_frame(gmail_sign_in)

    def gmail_login(self, user, passwd):
        email = Wait(self.marionette).until(
            expected.element_present(*self._email_locator))
        Wait(self.marionette).until(expected.element_displayed(email))
        email.tap()
        email.send_keys(user)
        password = self.marionette.find_element(*self._password_locator)
        password.tap()
        password.send_keys(passwd)
        self.keyboard.dismiss()
        self.marionette.find_element(*self._sign_in_locator).tap()

    def tap_grant_access(self):
        grant_access = self.marionette.find_element(*self._grant_access_button_locator)
        Wait(self.marionette).until(expected.element_enabled(grant_access))
        grant_access.tap()
        # Go back to displayed Contacts app before waiting for the picker
        Wait(self.marionette).until(lambda m: self.apps.displayed_app.name == 'Contacts')
        self.apps.switch_to_displayed_app()
        from gaiatest.apps.contacts.regions.contact_import_picker import ContactImportPicker
        return ContactImportPicker(self.marionette)
