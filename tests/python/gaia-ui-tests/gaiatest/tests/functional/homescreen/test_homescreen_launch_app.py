# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By

from gaiatest import GaiaTestCase
from gaiatest.apps.homescreen.app import Homescreen
from gaiatest.apps.homescreen.regions.confirm_install import ConfirmInstall


class TestLaunchApp(GaiaTestCase):

    MANIFEST = 'http://mozqa.com/data/webapps/mozqa.com/manifest.webapp'
    APP_NAME = 'Mozilla QA WebRT Tester'
    TITLE = 'Index of /data'

    _header_locator = (By.CSS_SELECTOR, 'h1')

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.connect_to_network()

        self.homescreen = Homescreen(self.marionette)
        self.apps.switch_to_displayed_app()
        self.homescreen.wait_for_homescreen_to_load()

        if not self.apps.is_app_installed(self.APP_NAME):

            # Install app
            self.apps.install(self.MANIFEST)

            # Confirm the installation and wait for the app icon to be present
            confirm_install = ConfirmInstall(self.marionette)
            confirm_install.tap_confirm()

        self.apps.switch_to_displayed_app()
        self.homescreen.wait_for_app_icon_present(self.APP_NAME)

    def test_launch_app(self):
        # Verify that the app icon is visible on one of the homescreen pages
        self.assertTrue(self.homescreen.is_app_installed(self.APP_NAME),
            "App %s not found on Homescreen" % self.APP_NAME)

        # Click icon and wait for h1 element displayed
        self.homescreen.installed_app(self.APP_NAME).tap_icon()
        self.wait_for_element_displayed(*self._header_locator, timeout=20)
        self.assertEqual(self.marionette.find_element(*self._header_locator).text, self.TITLE)
