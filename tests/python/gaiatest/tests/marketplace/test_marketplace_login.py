# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
import time


class TestMarketplaceLogin(GaiaTestCase):

    # Marketplace locators
    _login_button = ('css selector', 'a.button.browserid')
    _logged_in_locator = ('css selector', 'div.account.authenticated')
    _settings_cog_locator = ('css selector', 'a.header-button.settings')
    _settings_form_locator = ('css selector', 'form.form-grid')
    _email_account_field_locator = ('id', 'email')
    _logout_button = ('css selector', 'a.logout')

    def setUp(self):
        GaiaTestCase.setUp(self)

        if self.wifi:
            self.data_layer.enable_wifi()
            self.data_layer.connect_to_wifi(self.testvars['wifi'])

        # Launch the app
        self.app = self.apps.launch('Marketplace')

    def test_login_marketplace(self):
        # https://moztrap.mozilla.org/manage/case/4134/

        self.wait_for_element_displayed(*self._login_button)

        self.marionette.find_element(*self._login_button).click()

        self._login_to_persona(self.testvars['marketplace']['username'],
                               self.testvars['marketplace']['password'])

        # Switch back to marketplace and verify that user is logged in
        self.marionette.switch_to_frame()
        self.marionette.switch_to_frame(self.app.frame)

        # If you go too fast here marionette seems to crash the marketplace app
        time.sleep(5)
        self.wait_for_element_present(*self._logged_in_locator)

        # Click the cog
        self.marionette.find_element(*self._settings_cog_locator).click()

        self.wait_for_element_displayed(*self._settings_form_locator)

        self.assertEqual(self.testvars['marketplace']['username'],
                         self.marionette.find_element(*self._email_account_field_locator).get_attribute('value'))

        self.marionette.find_element(*self._logout_button).click()
        self.wait_for_element_not_present(*self._logged_in_locator)

    def _login_to_persona(self, username, password):

        persona_frame_locator = ('css selector', "iframe[name='__persona_dialog']")

        # Persona dialog
        waiting_locator = ('css selector', 'body.waiting')
        email_input_locator = ('id', 'authentication_email')
        password_input_locator = ('id', 'authentication_password')
        next_button_locator = ('css selector', 'button.start')
        returning_button_locator = ('css selector', 'button.returning')
        sign_in_button_locator = ('id', 'signInButton')

        # Switch to top level frame then Persona frame
        self.marionette.switch_to_frame()
        persona_frame = self.wait_for_element_present(*persona_frame_locator, timeout=20)
        self.marionette.switch_to_frame(persona_frame)

        # Wait for the loading to complete
        self.wait_for_element_not_present(*waiting_locator)

        if self.marionette.find_element(*email_input_locator).is_displayed():
            # Persona has no memory of your details ie after device flash
            email_field = self.marionette.find_element(*email_input_locator)
            email_field.send_keys(username)

            self.marionette.find_element(*next_button_locator).click()

            self.wait_for_element_displayed(*password_input_locator)
            password_field = self.marionette.find_element(*password_input_locator)
            password_field.send_keys(password)

            self.wait_for_element_displayed(*returning_button_locator)
            self.marionette.find_element(*returning_button_locator).click()

        else:
            # Persona remembers your username and password
            self.marionette.find_element(*sign_in_button_locator).click()

    def tearDown(self):
        # In the event that the test fails, a 2nd attempt
        # switch to marketplace frame and if we are logged in attempt to log out again
        self.marionette.switch_to_frame()
        self.marionette.switch_to_frame(self.app.frame)

        if self.is_element_present(*self._logged_in_locator):
            # Refresh to get back to the marketplace main page
            self.marionette.refresh()

            # click the cog
            self.marionette.find_element(*self._settings_cog_locator).click()
            self.wait_for_element_displayed(*self._settings_form_locator)
            self.marionette.find_element(*self._logout_button).click()

        if self.wifi:
            self.data_layer.disable_wifi()
        GaiaTestCase.tearDown(self)
