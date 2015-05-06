# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base


class FacebookLogin(Base):

    _iframe_locator = (By.CSS_SELECTOR, 'iframe[data-url*="m.facebook.com"]')
    _div_locator = (By.CSS_SELECTOR, 'div')
    _email_locator = (By.CSS_SELECTOR, 'input[placeholder^="Email"]')
    _password_locator = (By.CSS_SELECTOR, 'input[placeholder^="Password"]')
    _submit_locator = (By.CSS_SELECTOR, '*[type="submit"]')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        self.marionette.switch_to_frame()

        # wait for the pop up screen to open
        view = Wait(self.marionette, timeout=60).until(
            expected.element_present(*self._iframe_locator))
        Wait(self.marionette).until(expected.element_displayed(view))

        # Change the app to make use of the Facebook developer appId
        Wait(self.marionette, timeout=60).until(lambda m: view.get_attribute('data-url') != 'about:blank')

        # Desktop b2g uses this
        str = view.get_attribute('data-url').replace('123456', '323630664378726')
        # Device uses this
        str = str.replace('395559767228801', '323630664378726')

        self.marionette.switch_to_frame(view)
        # Wait until the original page has loaded a bit, because sometimes,
        # trying to load the 2nd page directly after the first, causes a blank page
        Wait(self.marionette, timeout=60).until(expected.element_present(*self._div_locator))
        self.marionette.navigate(str)
        Wait(self.marionette, timeout=60).until(expected.element_present(*self._email_locator))

    def type_email(self, email):
        self.marionette.find_element(*self._email_locator).send_keys(email)

    def type_password(self, password):
        self.marionette.find_element(*self._password_locator).send_keys(password)

    def tap_submit(self):
        el = self.marionette.find_element(*self._submit_locator)
        from gaiatest.apps.keyboard.app import Keyboard
        k = Keyboard(self.marionette)
        # The keyboard can overlay the submit button on desktop b2g, so close it
        k.dismiss()
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
