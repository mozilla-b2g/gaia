# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.homescreen.app import Homescreen


class TestMoveApp(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

        self.homescreen = Homescreen(self.marionette)
        self.apps.switch_to_displayed_app()

    def test_move_app_position(self):
        """
        Verify the user can move an application around on the homescreen.
        https://moztrap.mozilla.org/manage/case/1317/
        """

        # Go to app page
        self.homescreen.go_to_next_page()
        first_app_before_move = self.homescreen.visible_apps[0].name

        # Activate edit mode
        self.assertFalse(self.homescreen.is_edit_mode_active, "Edit mode should not be active")
        self.homescreen.activate_edit_mode()
        self.assertTrue(self.homescreen.is_edit_mode_active, "Edit mode should be active")

        # Move first app to position 12
        self.homescreen.move_app_to_position(0, 12)

        # Exit edit mode
        self.homescreen.touch_home_button()
        self.assertFalse(self.homescreen.is_edit_mode_active, "Edit mode should not be active")

        # Check the app order and that the app on position 12 is the right one
        first_app_after_move = self.homescreen.visible_apps[0].name
        self.assertNotEqual(first_app_before_move, first_app_after_move)
        self.assertEqual(first_app_before_move, self.homescreen.visible_apps[12].name)
