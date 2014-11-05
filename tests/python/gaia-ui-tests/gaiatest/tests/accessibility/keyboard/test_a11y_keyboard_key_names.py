# -*- coding: iso-8859-15 -*-
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.ui_tests.app import UiTests


class TestA11yKeyboardKeyNames(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)
        # enable auto-correction of keyboard
        self.data_layer.set_setting('keyboard.autocorrect', True)

    def test_a11y_keyboard_key_names(self):
        self.ui_tests = UiTests(self.marionette)
        self.ui_tests.launch()

        # go to UI/keyboard page
        keyboard_page = self.ui_tests.tap_keyboard_option()
        keyboard_page.switch_to_frame()

        # tap the field "input type=text"
        keyboard = keyboard_page.tap_text_input()

        keyboard.switch_to_keyboard();

        # check special 'return' key. It should have a role of pushbutton.
        self.assertEqual(keyboard.a11y_enter_key_name, 'return')
        self.assertEqual(keyboard.a11y_enter_key_role, 'pushbutton')

        # check special 'backspace' key. It should have a role of pushbutton.
        self.assertEqual(keyboard.a11y_backspace_key_name, 'delete')
        self.assertEqual(keyboard.a11y_backspace_key_role, 'pushbutton')

        # check 'space' key. It should have a role of key.
        self.assertEqual(keyboard.a11y_space_key_name, 'space')
        self.assertEqual(keyboard.a11y_space_key_role, 'key')
