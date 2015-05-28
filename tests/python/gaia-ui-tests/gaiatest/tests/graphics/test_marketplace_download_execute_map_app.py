# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
import time

from marionette_driver import Wait, By

from gaiatest.gaia_graphics_test import GaiaImageCompareTestCase
from gaiatest.apps.homescreen.app import Homescreen
from gaiatest.apps.marketplace.app import Marketplace
from gaiatest.apps.homescreen.regions.confirm_install import ConfirmInstall


class TestSearchMarketplaceAndInstallApp(GaiaImageCompareTestCase):
    """
    Install Bing Maps app from marketplace and open it
    """
    app_search = 'Bing Maps :packaged'
    app_title = 'Bing Maps'
    draw_wait_time = 5

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
        bingmap = self.marionette.find_element(*self._map_locator)
        Wait(self.marionette).until(lambda m: bingmap.is_displayed())
        time.sleep(self.draw_wait_time)
        self.take_screenshot()

        # once the map is completely loaded, use the UI to render different views
        # zoom in
        self.marionette.find_element(*self._zoom_in_locator).tap()
        time.sleep(self.draw_wait_time)
        self.take_screenshot()
        self.marionette.find_element(*self._zoom_in_locator).tap()
        time.sleep(self.draw_wait_time)
        self.take_screenshot()
        self.marionette.find_element(*self._zoom_in_locator).tap()
        time.sleep(self.draw_wait_time)
        self.take_screenshot()

        # move around
        self.scroll(self._map_locator, 'right', 100)
        time.sleep(self.draw_wait_time)
        self.take_screenshot()
        self.scroll(self._map_locator, 'down', 100)
        time.sleep(self.draw_wait_time)
        self.take_screenshot()

        # zoom out
        self.marionette.find_element(*self._zoom_out_locator).tap()
        time.sleep(self.draw_wait_time)
        self.take_screenshot()
        self.marionette.find_element(*self._zoom_out_locator).tap()
        time.sleep(self.draw_wait_time)
        self.take_screenshot()
        self.marionette.find_element(*self._zoom_out_locator).tap()
        time.sleep(self.draw_wait_time)
        self.take_screenshot()

