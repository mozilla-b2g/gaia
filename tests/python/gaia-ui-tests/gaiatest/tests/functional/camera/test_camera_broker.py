# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import Wait

from gaiatest import GaiaTestCase
from gaiatest.apps.homescreen.app import Homescreen
from gaiatest.apps.homescreen.regions.confirm_install import ConfirmInstall
from gaiatest.apps.system.app import System
from gaiatest.apps.camera.app import Camera

class TestLaunchApp(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

        # Turn off camera geolocation prompt
        self.apps.set_permission('Camera', 'geolocation', 'deny')

        # import pdb
        # pdb.set_trace()
        self.homescreen = Homescreen(self.marionette)
        self.apps.switch_to_displayed_app()

    def test_launch_app(self):
        # Verify that the app icon is visible on one of the homescreen pages
        stub_app = 'Test Camera'
        self.assertTrue(
            self.homescreen.is_app_installed(stub_app),
            'App %s not found on homescreen' % stub_app)

        # Click icon and wait for h1 element displayed
        self.homescreen.installed_app(stub_app).tap_icon()
        Wait(self.marionette).until(
            lambda m: m.title == stub_app)

        # Open the real Camera app and try to take a picture
        self.camera = Camera(self.marionette)
        self.camera.launch()
        self.camera.take_photo()
        self.assertTrue(self.camera.is_thumbnail_visible)

        # Switch back to the stub camera and confirm it's 'closed'
        self.marionette.switch_to_frame()
        stub_frame = self.marionette.find_element('css selector', "iframe[data-url*='test-camera']")
        self.marionette.switch_to_frame(stub_frame)
        status = self.marionette.execute_script("return document.getElementById('status').textContent;");
        self.assertEqual(status, 'closed')
