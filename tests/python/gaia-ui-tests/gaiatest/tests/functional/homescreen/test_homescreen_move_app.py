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
        self.homescreen.wait_for_homescreen_to_load()

    def test_move_app(self):
        """Verify the user can move an application around on the homescreen.

        https://moztrap.mozilla.org/manage/case/1317/
        """

        # Go to app page
        self.homescreen.go_to_next_page()

        # Activate edit mode
        self.assertFalse(self.homescreen.is_edit_mode_active, "Edit mode should not be active")
        self.homescreen.activate_edit_mode()
        self.assertTrue(self.homescreen.is_edit_mode_active, "Edit mode should be active")

        first_app_name_before_move = self.homescreen.visible_apps[0].name
        old_page_number = self.homescreen.homescreen_get_current_page_number

        # Move first app the next screen
        self.homescreen.move_app_to_next_screen(0)

        visible_app_names = [app.name for app in self.homescreen.visible_apps]

        # Check that the app was moved to next screen
        self.assertTrue(first_app_name_before_move in visible_app_names)
        self.assertTrue(old_page_number + 1 == self.homescreen.homescreen_get_current_page_number)

        first_app_name_before_move = self.homescreen.visible_apps[0].name
        old_page_number = self.homescreen.homescreen_get_current_page_number

        # Move first app the previous screen
        self.homescreen.move_app_to_previous_screen(0)

        # Check that the app was moved to previous screen
        visible_app_names = [app.name for app in self.homescreen.visible_apps]

        self.assertTrue(first_app_name_before_move in visible_app_names)
        self.assertTrue(old_page_number - 1 == self.homescreen.homescreen_get_current_page_number)

        first_app_name_before_move = self.homescreen.visible_apps[0].name

        # Move first app to position 12
        self.homescreen.move_app_to_position(0, 12)

        # Check the app order and that the app on position 12 is the right one
        first_app_after_move = self.homescreen.visible_apps[0].name

        self.assertNotEqual(first_app_name_before_move, first_app_after_move)
        self.assertEqual(first_app_name_before_move, self.homescreen.visible_apps[12].name)
