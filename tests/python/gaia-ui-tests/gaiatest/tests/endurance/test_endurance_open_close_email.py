# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaEnduranceTestCase
from gaiatest.mocks.mock_contact import MockContact

import time

# Approximate runtime per 100 iterations: xxx minutes

# PREREQUISITE: Email app already configured on the device for use with
# a pre-existing email account, so email app will start to inbox.

class TestEnduranceBrowserWifi(GaiaEnduranceTestCase):

    _loading_overlay = ('id', 'loading-overlay')

    def setUp(self):
        GaiaEnduranceTestCase.setUp(self)

        # Want wifi only
        self.data_layer.disable_cell_data()
        self.data_layer.enable_wifi()
        self.data_layer.connect_to_wifi(self.testvars['wifi'])

    def test_endurance_open_close_email(self):
        self.drive(test=self.open_close_email, app='email')

    def open_close_email(self):
        # Start email app
        self.app = self.apps.launch('e-mail')
        self.wait_for_element_not_displayed(*self._loading_overlay)        

        # Wait with page displayed
        time.sleep(5)

        # Close the browser using home button; my close_app doesn't work here b/c name (fix later)
        self.marionette.switch_to_frame()
        self.marionette.execute_script("window.wrappedJSObject.dispatchEvent(new Event('home'));")

        # Bring up the cards view
        _cards_view_locator = ('id', 'cards-view')
        self.marionette.execute_script("window.wrappedJSObject.dispatchEvent(new Event('holdhome'));")
        self.wait_for_element_displayed(*_cards_view_locator)

        # Sleep a bit
        time.sleep(2)

        # Tap the close icon for the current app
        locator_part_two = '#cards-view li.card[data-origin*="email"] .close-card'
        _close_button_locator = ('css selector', locator_part_two)
        close_card_app_button = self.marionette.find_element(*_close_button_locator)
        close_card_app_button.tap()       

        # Wait a couple of seconds between iterations
        time.sleep(2)

    def is_throbber_visible(self):
        return self.marionette.find_element(*self._throbber_locator).get_attribute('class') == 'loading'
