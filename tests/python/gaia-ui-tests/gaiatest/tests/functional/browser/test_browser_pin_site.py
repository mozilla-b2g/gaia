# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.homescreen.app import Homescreen
from gaiatest.apps.search.app import Search


class TestBrowserPinSite(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.connect_to_local_area_network()

        self.test_url = self.marionette.absolute_url('mozilla.html')

    def test_browser_pin_site(self):
        search = Search(self.marionette)
        search.launch()

        browser = search.go_to_url(self.test_url)
        browser.tap_menu_button()
        pin_dialog = browser.tap_pin_button()

        pin_dialog.tap_pin_site_to_home_screen()

        self.device.touch_home_button()

        homescreen = Homescreen(self.marionette)

        last_icon_position = len(homescreen.app_elements) - 1
        last_icon = homescreen.app_elements[last_icon_position]

        self.assertEqual(last_icon.manifest_url, self.test_url)

    def tearDown(self):
        self.apps.uninstall(self.test_url)
        GaiaTestCase.tearDown(self)
