# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest import GaiaTestCase
from gaiatest.apps.homescreen.app import Homescreen
from gaiatest.apps.marketplace.app import MarketplaceDev
from gaiatest.apps.system.app import System

class TestSearchMarketplaceAndInstallApp(GaiaTestCase):

    APP_INSTALLED = False

    # Installed app
    _app_root = (By.CSS_SELECTOR, ':root')

    app_search = ':packaged'

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.connect_to_network()

    def test_search_and_install_app(self):
        marketplace = MarketplaceDev(self.marionette, 'Marketplace')
        system = System(self.marionette)

        results = marketplace.search(self.app_search)
        first_result = results.search_results[0]
        app_name = first_result.get_app_name()
        first_result.tap_install_button()

        system.confirm_install()

        # Press Home button
        self.device.touch_home_button()

        # Check that the icon of the app is on the homescreen
        homescreen = Homescreen(self.marionette)
        self.apps.switch_to_displayed_app()

        self.assertTrue(homescreen.is_app_installed(app_name))

        installed_app = homescreen.installed_app(app_name)
        installed_app.tap_icon()
        self.apps.switch_to_displayed_app()

        self.wait_for_element_displayed(*self._app_root)

        self.apps.uninstall(app_name)
        system.confirm_uninstall()

        self.assertFalse(homescreen.is_app_installed(app_name))

    def tearDown(self):
        GaiaTestCase.tearDown(self)
