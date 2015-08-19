# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.homescreen.app import Homescreen


class TestHomeButton(GaiaTestCase):

    def test_home_button_moves_to_the_top_of_the_homescreen(self):
        home_screen = Homescreen(self.marionette)
        self.apps.switch_to_displayed_app()

        app_position_that_is_below_the_screen = 10
        home_screen.scroll_to_app(app_position_that_is_below_the_screen)
        self.assertFalse(home_screen.is_at_topmost_position)

        self.device.touch_home_button()
        self.assertTrue(home_screen.is_at_topmost_position)
