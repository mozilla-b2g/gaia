# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest import GaiaTestCase
from gaiatest.apps.marketplace.app import Marketplace
from gaiatest.apps.homescreen.app import Homescreen


class TestSearchMarketplaceAndInstallApp(GaiaTestCase):

    MARKETPLACE_DEV_NAME = 'Marketplace Dev'

    APP_INSTALLED = False

    # System app confirmation button to confirm installing an app
    _yes_button_locator = (By.ID, 'app-install-install-button')

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.connect_to_network()
        self.install_marketplace()

    def test_search_and_install_app(self):
        marketplace = Marketplace(self.marionette, self.MARKETPLACE_DEV_NAME)
        marketplace.launch()

        self.app_name = marketplace.popular_apps[0].name
        app_author = marketplace.popular_apps[0].author
        results = marketplace.search(self.app_name)

        self.assertGreater(len(results.search_results), 0, 'No results found.')

        first_result = results.search_results[0]

        self.assertEquals(first_result.name, self.app_name, 'First app has the wrong name.')
        self.assertEquals(first_result.author, app_author, 'First app has the wrong author.')

        # Find and click the install button to the install the web app
        self.assertEquals(first_result.install_button_text, 'Free', 'Incorrect button label.')

        first_result.tap_install_button()
        self.confirm_installation()
        self.APP_INSTALLED = True

        # Check that the icon of the app is on the homescreen
        homescreen = Homescreen(self.marionette)
        homescreen.switch_to_homescreen_frame()

        self.assertTrue(homescreen.is_app_installed(self.app_name))

    def confirm_installation(self):
        # TODO add this to the system app object when we have one
        self.wait_for_element_displayed(*self._yes_button_locator)
        self.marionette.find_element(*self._yes_button_locator).tap()
        self.wait_for_element_not_displayed(*self._yes_button_locator)

    def tearDown(self):

        if self.APP_INSTALLED:
            self.apps.uninstall(self.app_name)

        GaiaTestCase.tearDown(self)
