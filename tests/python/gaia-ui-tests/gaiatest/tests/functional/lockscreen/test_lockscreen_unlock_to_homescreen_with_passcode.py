# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest import GaiaTestCase
from gaiatest.apps.lockscreen.app import LockScreen


class TestLockScreen(GaiaTestCase):

    _input_passcode = '7931'

    # Homescreen locators
    _homescreen_frame_locator = (By.CSS_SELECTOR, 'div.homescreen iframe')
    _homescreen_landing_locator = (By.ID, 'landing-page')

    def setUp(self):
        GaiaTestCase.setUp(self)

        #set passcode-lock
        self.data_layer.set_setting('lockscreen.passcode-lock.code', self._input_passcode)
        self.data_layer.set_setting('lockscreen.passcode-lock.enabled', True)

        # this time we need it locked!
        self.lockscreen.lock()
        self.lock_screen = LockScreen(self.marionette)

    def test_unlock_to_homescreen_with_passcode(self):
        """Unlock device to homescreen when a passcode is set

        https://github.com/mozilla/gaia-ui-tests/issues/478
        """
        homescreen = self.lock_screen.unlock()
        self.lock_screen.passcode_pad.type_passcode(self._input_passcode)
        self.lock_screen.wait_for_lockscreen_not_visible()

        homescreen.switch_to_homescreen_frame()
        homescreen.wait_for_landing_page_visible()
