# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.homescreen.app import Homescreen


class TestHomeButtonInEditMode(GaiaTestCase):

    def test_home_button_exits_edit_mode(self):
        home_screen = Homescreen(self.marionette)
        self.apps.switch_to_displayed_app()

        home_screen.activate_edit_mode()

        self.device.touch_home_button()
        self.assertFalse(home_screen.is_edit_mode_active)
