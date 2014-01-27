# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.ui_tests.app import UiTests


class TestWindowOpenInsideIframe(GaiaTestCase):

    def test_window_open_inside_iframe(self):
        self.ui_tests = UiTests(self.marionette)
        self.ui_tests.launch()
        self.ui_tests.tap_ui_button()

        window_open = self.ui_tests.tap_window_open_menu_option()
        window_open.switch_to_frame()

        # Tap on the second window.open
        popup = window_open.tap_window_open_from_iframe()
        popup.switch_to_frame()

        self.assertEqual('Hello world!', popup.header_text)

        # Tap on the 'X' button
        popup.tap_x_button()

        self.assertFalse(popup.is_popup_page_displayed, 'Pop-up did not close')
