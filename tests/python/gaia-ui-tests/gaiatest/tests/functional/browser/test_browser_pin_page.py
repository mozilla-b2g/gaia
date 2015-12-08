# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time

from gaiatest import GaiaTestCase
from gaiatest.apps.homescreen.app import Homescreen
from gaiatest.apps.search.app import Search


class TestBrowserPinPage(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.connect_to_local_area_network()

        self.test_url = self.marionette.absolute_url('mozilla.html')

    def test_browser_pin_page(self):
        search = Search(self.marionette)
        search.launch()

        browser = search.go_to_url(self.test_url)
        browser.tap_menu_button()
        pin_dialog = browser.tap_pin_button()

        pin_dialog.tap_pin_page_to_home_screen()

        self.device.touch_home_button()

        homescreen = Homescreen(self.marionette)

        homescreen.go_to_pinned_pages_panel()

        print(len(homescreen.page_elements))
        last_icon_position = len(homescreen.page_elements) - 1
        last_icon = homescreen.page_elements[last_icon_position]
        print(last_icon.manifest_url)

        print(self.test_url)
        self.assertEqual(last_icon.manifest_url, self.test_url)
        homescreen.delete_app(self.test_url)
