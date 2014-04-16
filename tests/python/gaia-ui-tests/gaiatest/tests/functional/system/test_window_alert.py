# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.ui_tests.app import UiTests


class TestWindowAlert(GaiaTestCase):

    def test_window_alert(self):
        ui_tests = UiTests(self.marionette)
        ui_tests.launch()

        # Open Alert/Prompt menu
        alert_prompt_menu = ui_tests.tap_alert_prompt_button()
        alert_prompt_menu.switch_to_frame()

        # Tap alert button
        alert = alert_prompt_menu.tap_alert_button()
        self.assertEqual('Hello world!', alert.modal_text)
        alert.tap_ok_button()

        self.assertFalse(alert.is_modal_displayed, 'The alert did not close')
