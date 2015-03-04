# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import By

from gaiatest.gaia_graphics_test import GaiaImageCompareTestCase
from gaiatest.apps.homescreen.app import Homescreen


class testDragDrop(GaiaImageCompareTestCase):
    _homescreen_locator = (By.CLASS_NAME, 'theme-media')

    def setUp(self):
        GaiaImageCompareTestCase.setUp(self)

        self.homescreen = Homescreen(self.marionette)
        self.apps.switch_to_displayed_app()

    def test_drag_drop(self):

        self.take_screenshot()
        self.homescreen.wait_for_number_of_apps(1)

        # Assert that we are not in edit mode.
        self.assertFalse(self.homescreen.is_edit_mode_active, "Edit mode should not be active")

        # Move first app to position 3 (index 2) and to position 4
        self.homescreen.move_app_to_position(0, 2)
        self.take_screenshot()
        self.homescreen.move_app_to_position(2, 3)
        self.take_screenshot()
        self.homescreen.move_app_to_position(5, 4)
        self.take_screenshot()

        # Assert that we are in edit mode.
        self.assertTrue(self.homescreen.is_edit_mode_active, "Edit mode should be active")

        # Exit edit mode
        self.device.touch_home_button()
        self.assertFalse(self.homescreen.is_edit_mode_active, "Edit mode should not be active")
