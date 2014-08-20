# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest import GaiaTestCase
from gaiatest.apps.homescreen.app import Homescreen
from gaiatest.apps.marketplace.app import Marketplace


class TestSearchMarketplaceAndInstallApp(GaiaTestCase):

    MARKETPLACE_NAME = 'Marketplace'

    APP_INSTALLED = False

    _marketplace_iframe_locator = (By.CSS_SELECTOR, 'iframe[src*="marketplace"]')

    # System app confirmation button to confirm installing an app
    _yes_button_locator = (By.ID, 'app-install-install-button')

    # Installed app
    _result_box_locator = (By.ID, 'rezultat')

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.connect_to_network()

    def test_search_and_install_app(self):
        self.app_name = 'Calculator'

        marketplace = Marketplace(self.marionette, self.MARKETPLACE_NAME)
        marketplace.launch()

        iframe = self.marionette.find_element(*self._marketplace_iframe_locator)
        self.marionette.switch_to_frame(iframe)

        results = marketplace.search(self.app_name)
        first_result = results.search_results[0]
        first_result.tap_install_button()

        self.confirm_installation()
        self.APP_INSTALLED = True

        # Press Home button
        self.device.touch_home_button()

        # Check that the icon of the app is on the homescreen
        homescreen = Homescreen(self.marionette)
        self.apps.switch_to_displayed_app()

        self.assertTrue(homescreen.is_app_installed(self.app_name))

        installed_app = homescreen.installed_app(self.app_name)
        installed_app.tap_icon()
        self.apps.switch_to_displayed_app()

        self.wait_for_element_displayed(*self._result_box_locator)

    def confirm_installation(self):
        # TODO add this to the system app object when we have one
        self.wait_for_element_displayed(*self._yes_button_locator)
        self.marionette.find_element(*self._yes_button_locator).tap()
        self.wait_for_element_not_displayed(*self._yes_button_locator)

    def tearDown(self):
        if self.APP_INSTALLED:
            self.apps.uninstall(self.app_name)

        GaiaTestCase.tearDown(self)
