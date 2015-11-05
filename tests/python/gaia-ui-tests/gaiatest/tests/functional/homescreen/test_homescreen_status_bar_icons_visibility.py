# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import By

from gaiatest import GaiaTestCase
from gaiatest.apps.system.app import System
from gaiatest.apps.homescreen.app import Homescreen


class TestHomescreenStatusBarIconsVisibility(GaiaTestCase):

    def test_homescreen_status_bar_icons_visibility(self):
        self._assert_every_icon_is_present()
        self.apps.switch_to_displayed_app()
        homescreen = Homescreen(self.marionette)
        self.assertTrue(homescreen.is_at_topmost_position)

        # scroll last icon into homescreen view
        last_icon = len(homescreen.visible_apps) - 1
        homescreen.scroll_to_icon(icon_position=last_icon)

        self.assertFalse(homescreen.is_at_topmost_position)
        self._assert_every_icon_is_present()

    def _assert_every_icon_is_present(self):
        status_bar = System(self.marionette).status_bar
        self.assertTrue(status_bar.is_displayed)
        self.assertTrue(status_bar.is_mobile_connection_displayed)
        self.assertTrue(status_bar.is_battery_displayed)
        self.assertTrue(status_bar.is_time_displayed)
