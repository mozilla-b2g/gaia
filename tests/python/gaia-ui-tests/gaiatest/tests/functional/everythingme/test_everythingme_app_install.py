# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.homescreen.app import Homescreen


class TestEverythingMeInstallApp(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.apps.set_permission('Homescreen', 'geolocation', 'deny')
        self.connect_to_network()

    def test_installing_everything_me_app(self):
        # https://github.com/mozilla/gaia-ui-tests/issues/67

        homescreen = Homescreen(self.marionette)
        self.apps.switch_to_displayed_app()

        self.assertGreater(homescreen.collections_count, 0)
        collection = homescreen.tap_collection('Social')
        collection.wait_for_collection_screen_visible()

        app = collection.applications[0]
        app_name = app.name
        app.long_tap_to_install()
        app.tap_save_to_home_screen()

        notification_message = collection.notification_message
        self.assertEqual(notification_message, '%s added to Home Screen' % app_name)

        homescreen = collection.tap_exit()

        self.assertTrue(homescreen.is_app_installed(app_name),
                        'The app %s was not found to be installed on the home screen.' % app_name)
