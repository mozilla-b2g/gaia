# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time
from gaiatest import GaiaTestCase
from gaiatest.apps.marketplace.app import Marketplace
from gaiatest.mocks.persona_test_user import PersonaTestUser


class TestMarketplacePurchaseAppWifi(GaiaTestCase):

    _APP_NAME = 'Private Yacht'
    _app_icon_locator = ('xpath', "//li[@class='icon']//span[text()='%s']" % _APP_NAME)

    _homescreen_iframe_locator = ('css selector', 'div.homescreen iframe')

    def setUp(self):
        GaiaTestCase.setUp(self)

        if self.apps.is_app_installed(self._APP_NAME):
            self.apps.uninstall(self._APP_NAME)

        self.data_layer.connect_to_wifi()
        self.install_marketplace()

        # generate unverified PersonaTestUser account
        self.user = PersonaTestUser().create_user(verified=True, env={
            "browserid": "firefoxos.persona.org",
            "verifier": "marketplace-dev.allizom.org"})

    def test_marketplace_purchase_app_wifi(self):

        marketplace = Marketplace(self.marionette, 'Marketplace Dev')
        marketplace.launch()

        # Tap settings and sign in in Marketplace
        settings = marketplace.tap_settings()
        persona = settings.tap_sign_in()

        # login with PersonaTestUser account
        persona.login(self.user.email, self.user.password)

        # switch back to Marketplace
        self.marionette.switch_to_frame()
        marketplace.launch()

        # wait for the page to refresh and the sign out button to be visible
        settings.wait_for_sign_out_button()

        # Well I dunno, it just needs this
        time.sleep(3)

        settings.select_region("Spain")

        time.sleep(3)

        settings.tap_save_changes()

        # search for a paid app and tap on the price
        search = marketplace.search(self._APP_NAME)
        bango = search.search_results[0].tap_purchase_button()

        # pay app
        bango.create_pin('1234')

        # verify phone number
        bango.verify_phone_number(mobile_phone_number=self.testvars['carrier']['phone_number'],
                                  country=self.testvars['carrier']['country'],
                                  network=self.testvars['carrier']['network'])

        # but the app
        bango.wait_for_buy_app_section_displayed()
        bango.tap_buy_button()

        # At gaia System level, complete the installation prompt
        self._confirm_installation()

        # Switch into homescreen frame
        homescreen_frame = self.marionette.find_element(*self._homescreen_iframe_locator)
        self.marionette.switch_to_frame(homescreen_frame)

        # Not overly concerned about it being visible, only present
        self.assertTrue(self.is_element_present(*self._app_icon_locator))

    def _confirm_installation(self):
        _yes_button_locator = ('id', 'app-install-install-button')

        # TODO add this to the system app object when we have one
        self.wait_for_element_displayed(*_yes_button_locator)
        self.marionette.find_element(*_yes_button_locator).tap()
        self.wait_for_element_not_displayed(*_yes_button_locator)
