# -*- coding: iso-8859-15 -*-
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.ui_tests.app import UiTests


class TestEmailKeyboard(GaiaTestCase):

    def test_basic_email_keyboard(self):
        self.ui_tests = UiTests(self.marionette)
        self.ui_tests.launch()
        self.ui_tests.tap_ui_button()

        keyboard_page = self.ui_tests.tap_keyboard_option()
        keyboard_page.switch_to_frame()

        keyboard_page.tap_email_input()
        keyboard_page.keyboard.send('post')

        keyboard_page.switch_to_frame()
        keyboard_page.tap_email_input()

        keyboard_page.keyboard.switch_to_keyboard()
        # '@' must be on the default email keyboard layout
        keyboard_page.keyboard._tap('@')
        self.apps.switch_to_displayed_app()

        keyboard_page.switch_to_frame()
        keyboard_page.tap_email_input()
        keyboard_page.keyboard.send('mydomain.com')

        keyboard_page.switch_to_frame()
        typed_email_adress = keyboard_page.email_input
        self.assertEqual(typed_email_adress, u'post@mydomain.com')
