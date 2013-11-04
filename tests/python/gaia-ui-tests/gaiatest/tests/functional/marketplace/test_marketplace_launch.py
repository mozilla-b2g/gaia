# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.homescreen.app import Homescreen
from marionette.by import By

class TestMarketplaceLaunch(GaiaTestCase):
    
    _loading_fragment_locator = (By.CSS_SELECTOR, 'div.loading-fragment')
    
    def setUp(self):
        GaiaTestCase.setUp(self)
        self.apps.set_permission('Homescreen', 'geolocation', 'deny')
        self.connect_to_network()
    
    def test_marketplace_launch(self):
        
        app_name = 'Marketplace'
        homescreen = Homescreen(self.marionette)
        homescreen.switch_to_homescreen_frame()
        
        self.assertTrue(homescreen.is_app_installed(app_name))
        
        marketplace = homescreen.installed_app(app_name)
        marketplace.tap_icon()
        
        self.assertIn(app_name, self.marionette.title)

        self.wait_for_element_not_displayed(*self._loading_fragment_locator)