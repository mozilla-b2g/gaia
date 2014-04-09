# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.homescreen.app import Homescreen


class TestEverythingMeInstallApp(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)
        # Force disable rocketbar
        self.data_layer.set_setting('rocketbar.enabled', False)
        self.apps.set_permission('Homescreen', 'geolocation', 'deny')
        self.connect_to_network()

    def test_installing_everything_me_app(self):
        homescreen = Homescreen(self.marionette)
        self.apps.switch_to_displayed_app()
        homescreen.wait_for_homescreen_to_load()

        self.assertGreater(homescreen.collections_count, 0)
        collection = homescreen.tap_collection('Social')
        collection.wait_for_collection_screen_visible()

        app = collection.applications[0]
        app_name = app.name
        app.long_tap_to_install()
        add_link = app.tap_save_to_home_screen()
        add_link.switch_to_add_bookmark_frame()
        add_link.tap_add_bookmark_to_home_screen_dialog_button()

        # Switch to Home Screen to look for app
        self.device.touch_home_button()

        self.assertTrue(homescreen.is_app_installed(app_name),
                        'The app %s was not found to be installed on the home screen.' % app_name)
