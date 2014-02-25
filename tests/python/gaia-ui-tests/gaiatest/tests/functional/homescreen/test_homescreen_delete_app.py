# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By

from gaiatest import GaiaTestCase
from gaiatest.apps.homescreen.app import Homescreen
from gaiatest.apps.homescreen.regions.confirm_install import ConfirmInstall

class TestDeleteApp(GaiaTestCase):

    MANIFEST = 'http://mozqa.com/data/webapps/mozqa.com/manifest.webapp'
    APP_NAME = 'Mozilla QA WebRT Tester'

    def setUp(self):
        GaiaTestCase.setUp(self)

        self.homescreen = Homescreen(self.marionette)
        self.apps.switch_to_displayed_app()
        self.homescreen.wait_for_homescreen_to_load()

        if not self.apps.is_app_installed(self.APP_NAME):

            self.connect_to_network()

            # Install app so we can delete it
            self.marionette.execute_script(
                'navigator.mozApps.install("%s")' % self.MANIFEST)

            # Confirm the installation and wait for the app icon to be present
            confirm_install = ConfirmInstall(self.marionette)
            confirm_install.tap_confirm()

        self.apps.switch_to_displayed_app()
        self.homescreen.wait_for_app_icon_present(self.APP_NAME)

    def test_delete_app(self):

        # Verify that the app is installed i.e. the app icon is visible on one of the homescreen pages
        self.assertTrue(self.homescreen.is_app_installed(self.APP_NAME),
            "App %s not found on Homescreen" % self.APP_NAME)

        # Activate edit mode
        self.homescreen.activate_edit_mode()

        # Tap on the (x) to start delete process and tap on the confirm delete button
        self.homescreen.installed_app(self.APP_NAME).tap_delete_app().tap_confirm()

        self.wait_for_condition(lambda m: self.apps.displayed_app.name == self.homescreen.name)
        self.apps.switch_to_displayed_app()
        self.homescreen.wait_for_app_icon_not_present(self.APP_NAME)

        # Check that the app is no longer available
        with self.assertRaises(AssertionError):
            self.apps.launch(self.APP_NAME)
