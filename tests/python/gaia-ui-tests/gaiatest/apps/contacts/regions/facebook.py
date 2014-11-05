# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette import expected
from marionette import Wait
from marionette.by import By
from gaiatest.apps.base import Base


class FacebookLogin(Base):

    _iframe_locator = (By.CSS_SELECTOR, 'iframe[data-url*="m.facebook.com/login.php"]')
    _email_locator = (By.CSS_SELECTOR, 'input[placeholder^="Email"]')
    _password_locator = (By.CSS_SELECTOR, 'input[placeholder^="Password"]')
    _submit_locator = (By.CSS_SELECTOR, 'button[value^="Log In"]')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        self.marionette.switch_to_frame()
        # wait for the pop up screen to open
        view = Wait(self.marionette, timeout=60).until(
            expected.element_present(*self._iframe_locator))
        self.marionette.switch_to_frame(view)

        # Wait for when the login elements are available
        # Wait(self.marionette).until(expected.element_present doesn't seem to work
        # reliably when websites load slowly, see bug 1086680, comment 16
        self.marionette.execute_async_script("""
        setInterval(function() {
          if (content.document.querySelector('input[placeholder^="Email"]'))
            marionetteScriptFinished()
        }, 1000);
        """, script_timeout=30000)
        # Wait(self.marionette).until(expected.element_present(*self._email_locator))

    def type_email(self, email):
        self.marionette.find_element(*self._email_locator).send_keys(email)

    def type_password(self, password):
        self.marionette.find_element(*self._password_locator).send_keys(password)

    def tap_submit(self):
        self.marionette.find_element(*self._submit_locator).tap()

    def login(self, user, password):
        self.type_email(user)
        self.type_password(password)
        self.tap_submit()

        # Go back to displayed Contacts app before waiting for the picker
        Wait(self.marionette).until(
            lambda m: self.apps.displayed_app.name == 'Contacts')
        self.apps.switch_to_displayed_app()

        # switch to facebook import page to select the friends
        from gaiatest.apps.contacts.regions.contact_import_picker import ContactImportPicker
        return ContactImportPicker(self.marionette)
