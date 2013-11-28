# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
from marionette.by import By

from gaiatest import GaiaTestCase
from gaiatest.apps.browser.app import Browser
from gaiatest.apps.browser.regions.http_authenticate import AuthenticationDialog


class TestBrowserHttpsAuth(GaiaTestCase):

    _login_link_locator = (By.LINK_TEXT, 'Basic Authentication')
    _auth_dialog_locator = (By.ID, 'http-authentication-dialog')
    _success_message_locator = (By.XPATH, '/html/body/p')

    _success_redirect_url = 'http://mozqa.com/data/mozqa.com/http_auth/basic/'

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.connect_to_network()

    def test_browser_https_auth_login(self):
        browser = Browser(self.marionette)
        browser.launch()

        browser.go_to_url('http://mozqa.com/data/mozqa.com/http_auth/')

        browser.switch_to_content()

        self.wait_for_element_present(*self._login_link_locator)
        login_link = self.marionette.find_element(*self._login_link_locator)
        login_link.tap()

        browser.switch_to_chrome()

        auth_region = AuthenticationDialog(self.marionette)
        auth_region.authenticate('mozilla', 'mozilla')

        self.wait_for_condition(lambda m: browser.url == self._success_redirect_url)

        browser.switch_to_content()

        self.wait_for_element_displayed(*self._success_message_locator)
        success_message = self.marionette.find_element(*self._success_message_locator)
        self.assertEquals('Basic Authentication is successful!', success_message.text)
