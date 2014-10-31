# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.homescreen.app import Homescreen


class TestDivider(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

        self.homescreen = Homescreen(self.marionette)
        self.apps.switch_to_displayed_app()

    def test_create_delete_divider(self):
        """
        https://moztrap.mozilla.org/manage/case/13082/
        https://moztrap.mozilla.org/manage/case/13096/
        """

        self.homescreen.wait_for_number_of_apps(7)
        initial_number_of_dividers = len(self.homescreen.divider_elements)

        # Move last app to last divider
        app_position = len(self.homescreen.app_elements) - 1
        divider_position = initial_number_of_dividers - 1
        self.homescreen.move_to_divider(app_position, divider_position)
        self.assertTrue(self.homescreen.is_edit_mode_active, "Edit mode should be active")

        # Exit edit mode
        self.device.touch_home_button()
        self.assertEqual(initial_number_of_dividers + 1, len(self.homescreen.divider_elements))

        # Move last app to lastApp - 1 so that the new divider is removed
        self.homescreen.move_app_to_position(app_position, app_position - 1)

        # Exit edit mode
        self.device.touch_home_button()
        self.assertEqual(initial_number_of_dividers, len(self.homescreen.divider_elements))
