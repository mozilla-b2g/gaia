# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import By

from gaiatest import GaiaTestCase
from gaiatest.apps.system.app import System


class TestHomescreenStatusBarIconsVisibility(GaiaTestCase):

    homescreen_frame_locator = (By.CSS_SELECTOR, '#homescreen iframe')
    homescreen_all_icons_locator = (By.CSS_SELECTOR, 'gaia-grid .icon')

    def setUp(self):
        GaiaTestCase.setUp(self)

    def test_homescreen_status_bar_icons_visibility(self):
        # scroll last icon into homescreen view
        self.marionette.switch_to_frame(
            self.marionette.find_element(*self.homescreen_frame_locator))
        homescreen_last_icon = self.marionette.find_elements(
            *self.homescreen_all_icons_locator)[-1]
        self.marionette.execute_script(
            'arguments[0].scrollIntoView(false);', [homescreen_last_icon])
        self.assertGreater(self.marionette.execute_script(
            "return window.scrollY"), 0)
        # Check that statusbar and battery icon are displayed
        status_bar = System(self.marionette).status_bar
        self.assertTrue(status_bar.is_displayed)
        self.assertTrue(status_bar.maximized.is_battery_displayed)
