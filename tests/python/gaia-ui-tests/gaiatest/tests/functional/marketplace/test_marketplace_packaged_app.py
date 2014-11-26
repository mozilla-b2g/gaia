# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time
from marionette import expected
from marionette import Wait
from marionette.by import By
from gaiatest import GaiaTestCase
from gaiatest.apps.homescreen.app import Homescreen
from gaiatest.apps.marketplace.app import MarketplaceDev
from gaiatest.apps.homescreen.regions.confirm_install import ConfirmInstall

class TestSearchMarketplaceAndInstallApp(GaiaTestCase):
    
    app_search = ':packaged'
    
    def setUp(self):
        GaiaTestCase.setUp(self)
        self.connect_to_local_area_network()
        self.data_layer.set_setting('dom.mozApps.use_reviewer_certs', True)
        str = self.data_layer.get_setting('dom.mozApps.signed_apps_installable_from')
        self.data_layer.set_setting('dom.mozApps.signed_apps_installable_from', str + ',https://marketplace-dev.allizom.org')
    
    def test_search_and_install_app(self):

        # bogus app name, but the manifest_url will take precedence anyway, when specified
        marketplace = MarketplaceDev(self.marionette, 'a', 'https://marketplace.firefox.com/app/965bbfd7-936d-451d-bebf-fafdc7ce8d9e/manifest.webapp')
        # marketplace = MarketplaceDev(self.marionette, 'a', 'https://marketplace.firefox.com/app/1007e041-7d37-4eb7-b445-ff077a2bba42/manifest.webapp')

        results = marketplace.search(self.app_search)
        first_result = results.search_results[0]
        app_name = first_result.get_app_name()
        first_result.tap_install_button()

        # Confirm the installation and wait for the app icon to be present
        confirm_install = ConfirmInstall(self.marionette)
        confirm_install.tap_confirm()

        # Once bug 1077446 is fixed, this line can be uncommented
        # self.assertEqual(self.apps.displayed_app.name, 'Dev')

        # Press Home button
        self.device.touch_home_button()

        # Check that the icon of the app is on the homescreen
        homescreen = Homescreen(self.marionette)
        homescreen.wait_for_app_icon_present(app_name)

        installed_app = homescreen.installed_app(app_name)
        installed_app.tap_icon()

        Wait(self.marionette).until(lambda m: m.title == app_name)
