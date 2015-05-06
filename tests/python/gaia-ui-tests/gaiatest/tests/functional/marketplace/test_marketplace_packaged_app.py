# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import Wait

from gaiatest import GaiaTestCase
from gaiatest.apps.homescreen.app import Homescreen
from gaiatest.apps.marketplace.app import Marketplace
from gaiatest.apps.homescreen.regions.confirm_install import ConfirmInstall


class TestSearchMarketplaceAndInstallApp(GaiaTestCase):

    app_search = 'test-webapi-permissions :packaged'
    app_title = 'Privileged App Test'

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.connect_to_local_area_network()

    def test_search_and_install_app(self):

        marketplace = Marketplace(self.marionette)
        marketplace.launch()

        results = marketplace.search(self.app_search)
        first_result = results.search_results[0]
        app_name = first_result.get_app_name()
        first_result.tap_install_button()

        # Confirm the installation and wait for the app icon to be present
        confirm_install = ConfirmInstall(self.marionette)
        confirm_install.tap_confirm()

        self.assertEqual(self.apps.displayed_app.name, 'Marketplace')

        self.device.touch_home_button()

        # Check that the icon of the app is on the homescreen
        homescreen = Homescreen(self.marionette)
        homescreen.wait_for_app_icon_present(app_name)

        installed_app = homescreen.installed_app(app_name)
        installed_app.tap_icon()

        Wait(self.marionette).until(lambda m: m.title == self.app_title)
