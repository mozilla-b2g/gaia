# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By

from gaiatest import GaiaTestCase
from gaiatest.apps.homescreen.app import Homescreen

MANIFEST = 'http://mozqa.com/data/webapps/mozqa.com/manifest.webapp'
APP_NAME = 'Mozilla QA WebRT Tester'
TITLE = 'Index of /data'


class TestLaunchApp(GaiaTestCase):
    _confirm_install_button_locator = (By.ID, 'app-install-install-button')
    _header_locator = (By.CSS_SELECTOR, 'h1')

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.connect_to_network()

        self.homescreen = Homescreen(self.marionette)
        self.homescreen.launch()

        # Install app
        self.marionette.switch_to_frame()
        self.marionette.execute_script(
            'navigator.mozApps.install("%s")' % MANIFEST)

        # Confirm the installation and wait for the app icon to be present
        self.wait_for_element_displayed(*self._confirm_install_button_locator)
        self.marionette.find_element(*self._confirm_install_button_locator).tap()
        self.homescreen.switch_to_homescreen_frame()
        self.homescreen.wait_for_app_icon_present(APP_NAME)

    def test_launch_app(self):
        # Verify that the app icon is visible on one of the homescreen pages
        self.assertTrue(self.homescreen.is_app_installed(APP_NAME),
            "App %s not found on Homescreen" % APP_NAME)

        # Click icon and wait for h1 element displayed
        self.homescreen.installed_app(APP_NAME).tap_icon()
        self.wait_for_element_displayed(*self._header_locator, timeout=20)
        self.assertEqual(self.marionette.find_element(*self._header_locator).text, TITLE)

    def tearDown(self):
        self.apps.uninstall(APP_NAME)
        GaiaTestCase.tearDown(self)
