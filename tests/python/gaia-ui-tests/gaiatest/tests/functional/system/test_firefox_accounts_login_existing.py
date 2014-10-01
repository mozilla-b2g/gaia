# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.settings.app import Settings
from gaiatest.utils.fxa.fxa_user import FxAUser


class TestFirefoxAccounts(GaiaTestCase):

    def setUp(self):

        GaiaTestCase.setUp(self)
        self.connect_to_network()

        self.user = FxAUser()
        self.settings = Settings(self.marionette)
        self.settings.launch()


    def test_firefox_accounts_login_existing_via_settings(self):

        # enter FxA through Settings menu
        fxa = self.settings.open_firefox_accounts_settings()

        fxa.tap_firefox_accounts_login_button()
        fxa.switch_to_firefox_accounts_frame()

        email = self.user.email_existing()
        fxa.enter_email(email)
        fxa.tap_button_next()

        password = self.user.password()
        fxa.enter_password_user_existing(password)
        fxa.tap_button_next()
        fxa.tap_button_done()
