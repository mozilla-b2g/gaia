# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
from marionette.marionette_test import parameterized

from gaiatest.gaia_graphics_test import GaiaImageCompareTestCase
from gaiatest.apps.settings.app import Settings


class TestSettingsRTLAC(GaiaImageCompareTestCase):
    def setUp(self):
        GaiaImageCompareTestCase.setUp(self)
        self.connect_to_local_area_network()

    # Note: this test case does not cover new account creation, since it would require a new email address each time.
    # this test runs three separate scenarios using @parameterized
    @parameterized("valid_login", 'login')
    @parameterized("invalid_password", 'password')
    @parameterized("unverified_acct", 'unverified')
    def test_settings_app(self, option):
        settings = Settings(self.marionette)
        settings.launch()
        findmydevice_view = settings.open_findmydevice()

        if option == 'login':  # do normal login
            self.take_screenshot('findmydevice')
            fxaccount = findmydevice_view.tap_login()
            self.take_screenshot('findmydevice-email')
            fxaccount.enter_email(self.environment.email['gmail']['email'])
            self.take_screenshot('findmydevice-password')
            fxaccount.enter_password(self.environment.email['gmail']['password'])
            fxaccount.wait_for_successful_login()
            self.take_screenshot('findmydevice-loginsuccess')
            fxaccount.tap_done()
            findmydevice_view.wait_for_enable_switch_to_be_turned_on()
            self.take_screenshot('findmydevice-loggedin')

            # capture the caption change
            settings.return_to_prev_menu(settings.screen_element)
            self.take_screenshot('settings-firefox_accounts')

            # capture the view change in fxaccounts page after successful login
            settings.open_firefox_accounts()
            self.take_screenshot('firefox_accounts')

        elif option == 'password': # provide incorrect password
            fxaccount = findmydevice_view.tap_login()
            fxaccount.enter_email(self.environment.email['gmail']['email'])
            fxaccount.enter_password('wrongpassword')
            fxaccount.wait_for_password_error()
            self.take_screenshot('findmydevice-pwderror')
            fxaccount.close_password_error()

        elif option == 'unverified': # use unverified account
            fxaccount = findmydevice_view.tap_login()
            fxaccount.enter_email('rtl@unverified')
            fxaccount.enter_password('unverified')
            fxaccount.wait_for_successful_login()
            self.take_screenshot('findmydevice-verifypending')
            fxaccount.tap_done()
            self.take_screenshot('findmydevice-confirmyouracct')

            # capture the caption change
            settings.return_to_prev_menu(settings.screen_element)
            self.take_screenshot('settings-firefox_accounts')

            # fxaccounts page should display a message about confirmation
            settings.open_firefox_accounts()
            self.take_screenshot('firefox_accounts')
