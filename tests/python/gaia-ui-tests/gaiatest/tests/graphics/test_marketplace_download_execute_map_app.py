# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
import time

from marionette_driver import By

from gaiatest.gaia_graphics_test import GaiaImageCompareTestCase
from gaiatest.apps.marketplace.app import Marketplace
from gaiatest.apps.homescreen.regions.confirm_install import ConfirmInstall


class TestSearchMarketplaceAndInstallApp(GaiaImageCompareTestCase):
    """
    Install Bing Maps app from marketplace and open it
    """
    app_search = 'Bing Maps :packaged'
    app_title = 'Bing Maps'
    draw_wait_time = 10

    _map_locator = (By.ID, 'MobileMap')
    _zoom_in_locator = (By.ID, 'zoomin')
    _zoom_out_locator = (By.ID, 'zoomout')

    def setUp(self):
        GaiaImageCompareTestCase.setUp(self)
        self.connect_to_local_area_network()

    def test_install_and_execute_bing_map(self):

        marketplace = Marketplace(self.marionette)
        marketplace.launch()

        results = marketplace.search(self.app_search)
        first_result = results.search_results[0]
        first_result.tap_install_button()
        confirm_install = ConfirmInstall(self.marionette)
        confirm_install.tap_confirm()

        results = marketplace.get_current_displayed_result()
        first_result = results.search_results[0]
        first_result.tap_open_app_button(self._map_locator)

        self.take_screenshot(prewait=self.draw_wait_time)
        self.marionette.find_element(*self._zoom_in_locator).tap()
        self.take_screenshot(prewait=self.draw_wait_time)
        self.marionette.find_element(*self._zoom_in_locator).tap()
        self.take_screenshot(prewait=self.draw_wait_time)
        self.marionette.find_element(*self._zoom_in_locator).tap()
        self.take_screenshot(prewait=self.draw_wait_time)

        # move around
        GaiaImageCompareTestCase.scroll(self.marionette, 'right',
                                        100, locator=self._map_locator)

        self.take_screenshot(prewait=self.draw_wait_time)
        GaiaImageCompareTestCase.scroll(self.marionette, 'down',
                                        100, locator=self._map_locator)

        self.take_screenshot(prewait=self.draw_wait_time)

        # zoom out
        self.marionette.find_element(*self._zoom_out_locator).tap()
        self.take_screenshot(prewait=self.draw_wait_time)
        self.marionette.find_element(*self._zoom_out_locator).tap()
        self.take_screenshot(prewait=self.draw_wait_time)
        self.marionette.find_element(*self._zoom_out_locator).tap()
        self.take_screenshot(prewait=self.draw_wait_time)

