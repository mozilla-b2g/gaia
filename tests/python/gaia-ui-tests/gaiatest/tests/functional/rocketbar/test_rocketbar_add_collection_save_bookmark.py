# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.homescreen.app import Homescreen


class TestRocketBarAddCollectionSaveBookmark(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.connect_to_local_area_network()

    def test_rocketbar_add_collection(self):
        homescreen = Homescreen(self.marionette)
        self.apps.switch_to_displayed_app()

        contextmenu = homescreen.open_context_menu()
        collection_activity = contextmenu.tap_add_collection()

        collection_list = collection_activity.collection_name_list
        # Choose the second option to avoid 'Custom'
        collection = collection_list[1]

        collection_activity.select(collection)
        homescreen.wait_to_be_displayed()
        self.apps.switch_to_displayed_app()

        self.assertTrue(homescreen.is_app_installed(collection),
                        "Collection '%s' not found on Homescreen" % collection)

        collection = homescreen.tap_collection(collection)

        app = collection.applications[0]
        app_name = app.name
        app.long_tap_to_install()
        add_link = app.tap_save_to_home_screen()
        add_link.tap_add_bookmark_to_home_screen_dialog_button()

        # Switch to Home Screen to look for app
        self.device.touch_home_button()

        self.assertTrue(homescreen.is_app_installed(app_name),
                        'The app %s was not found to be installed on the home screen.' % app_name)
