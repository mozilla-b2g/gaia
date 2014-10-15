# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette import Wait

from gaiatest import GaiaTestCase
from gaiatest.apps.homescreen.app import Homescreen
from gaiatest.apps.homescreen.regions.confirm_install import ConfirmInstall
from gaiatest.apps.system.app import System


class TestLaunchApp(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.connect_to_network()

        # Turn off geolocation prompt for smart collections
        self.apps.set_permission('Smart Collections', 'geolocation', 'deny')

        self.homescreen = Homescreen(self.marionette)
        self.apps.switch_to_displayed_app()

        self.test_data = {
            'name': 'Mozilla QA WebRT Tester',
            'url': 'http://mozqa.com/data/webapps/mozqa.com/manifest.webapp',
            'title': 'Index of /data',
            'type': 'hosted'}

        self.test_data2 = {
            'name': 'packagedapp1',
            'url': 'http://mozqa.com/data/webapps/packaged1/manifest.webapp',
            'title': 'Packaged app1',
            'type': 'packaged'}

        if self.device.is_desktop_b2g or self.data_layer.is_wifi_connected():
            self.test_data['url'] = self.marionette.absolute_url(
                'webapps/mozqa.com/manifest.webapp')
            self.test_data['title'] = 'Directory listing for /'

            self.test_data2['url'] = self.marionette.absolute_url(
                'webapps/packaged1/manifest.webapp')
            self.test_data2['title'] = 'Packaged app1'

        self.install_app(self.test_data)
        self.install_app(self.test_data2)

    def install_app(self, test_data):
        if not self.apps.is_app_installed(test_data['name']):
            # Install app
            str = ''
            if test_data['type'] == 'packaged':
                str = 'Package'
            self.marionette.execute_script(
                'navigator.mozApps.install%s("%s")' % (str, test_data['url']))

            # Confirm the installation and wait for the app icon to be present
            confirm_install = ConfirmInstall(self.marionette)
            confirm_install.tap_confirm()

            # Wait for the notification to disappear
            system = System(self.marionette)
            system.wait_for_system_banner_displayed()
            system.wait_for_system_banner_not_displayed()

            self.apps.switch_to_displayed_app()
            self.homescreen.wait_for_app_icon_present(test_data['name'])

    def test_launch_app(self):
        # Verify that the app icon is visible on one of the homescreen pages
        self.assertTrue(
            self.homescreen.is_app_installed(self.test_data['name']),
            'App %s not found on homescreen' % self.test_data['name'])

        # Click icon and wait for h1 element displayed
        self.homescreen.installed_app(self.test_data['name']).tap_icon()
        Wait(self.marionette).until(
            lambda m: m.title == self.test_data['title'])

        self.device.touch_home_button()
        self.device.touch_home_button()
        self.homescreen.wait_for_app_icon_present(self.test_data2['name'])

        # Verify that the app icon is visible on one of the homescreen pages
        self.assertTrue(
            self.homescreen.is_app_installed(self.test_data2['name']),
            'App %s not found on homescreen' % self.test_data2['name'])

        # Click icon and wait for h1 element displayed
        self.homescreen.installed_app(self.test_data2['name']).tap_icon()
        Wait(self.marionette).until(
            lambda m: m.title == self.test_data2['title'])
