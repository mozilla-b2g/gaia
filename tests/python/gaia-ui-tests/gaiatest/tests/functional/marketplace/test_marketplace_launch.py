# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.homescreen.app import Homescreen
from gaiatest.apps.marketplace.app import Marketplace
from marionette_driver import expected, By, Wait


class TestMarketplaceLaunch(GaiaTestCase):

    _marketplace_iframe_locator = (By.CSS_SELECTOR, 'iframe[src*="marketplace"]')
    _site_header_locator = (By.ID, 'site-header')

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.connect_to_local_area_network()

    def test_marketplace_launch(self):

        marketplace = Marketplace(self.marionette)
        homescreen = Homescreen(self.marionette)
        self.apps.switch_to_displayed_app()

        self.assertTrue(homescreen.is_app_installed(marketplace.manifest_url))

        marketplace_icon = homescreen.installed_app(marketplace.manifest_url)
        marketplace_icon.tap_icon()

        Wait(self.marionette, timeout=60).until(expected.element_present(*self._marketplace_iframe_locator))

        iframe = self.marionette.find_element(*self._marketplace_iframe_locator)
        self.marionette.switch_to_frame(iframe)

        Wait(self.marionette).until(expected.element_displayed(*self._site_header_locator))
