# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.homescreen.app import Homescreen


class TestEditMode(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

        self.homescreen = Homescreen(self.marionette)
        self.apps.switch_to_displayed_app()

    def test_access_and_leave_edit_mode(self):

        self.homescreen.go_to_next_page()

        # Go to edit mode
        self.homescreen.activate_edit_mode()

        # Verify that edit mode is active
        self.assertTrue(self.homescreen.is_edit_mode_active, "Edit mode should be active")

        # Tap home button and verify that edit mode is no longer active
        self.homescreen.touch_home_button()

        self.assertFalse(self.homescreen.is_edit_mode_active, "Edit mode should not be active")
