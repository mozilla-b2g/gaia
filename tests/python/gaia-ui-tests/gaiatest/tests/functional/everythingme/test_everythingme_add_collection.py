# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest import GaiaTestCase
from gaiatest.apps.homescreen.app import Homescreen
import time

class TestEverythingMeLongPress(GaiaTestCase):
    
    def setUp(self):
        GaiaTestCase.setUp(self)
        self.apps.set_permission('Homescreen', 'geolocation', 'deny')
        self.connect_to_network()
    
    def test_longpress(self):
        
        homescreen = Homescreen(self.marionette)
        homescreen.switch_to_homescreen_frame()
        
        contextmenu = homescreen.open_context_menu()
        self.assertGreater(contextmenu.options_count, 1)
        collectionsmenu = contextmenu.tap_collections()
        collectionsmenu.tap_app('Autos')
        collectionsmenu.tap_confirm()
        self.assertTrue(homescreen.is_app_installed('Autos'),
                        "App %s not found on Homescreen" % 'Autos')
