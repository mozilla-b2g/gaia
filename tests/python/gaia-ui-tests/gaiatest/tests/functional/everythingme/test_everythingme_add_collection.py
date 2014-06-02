# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.homescreen.app import Homescreen
import random


class TestEverythingMeAddCollection(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)
        # Force disable rocketbar
        self.data_layer.set_setting('rocketbar.enabled', False)
        self.apps.set_permission('Homescreen', 'geolocation', 'deny')
        self.connect_to_network()

    def test_everythingme_add_collection(self):
        homescreen = Homescreen(self.marionette)
        self.apps.switch_to_displayed_app()
        homescreen.wait_for_homescreen_to_load()

        contextmenu = homescreen.open_context_menu()
        contextmenu.tap_add_collection()

        collection_list = contextmenu.collection_name_list
        collection = random.choice(collection_list[1:])

        homescreen.select(collection)
        self.assertTrue(homescreen.is_app_installed(collection),
                        "Collection '%s' not found on Homescreen" % collection)
