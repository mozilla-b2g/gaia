# -*- coding: iso-8859-15 -*-
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.ui_tests.app import UiTests
import time

class TestKeyboardBug1073870(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)
        # enable auto-correction of keyboard
        self.data_layer.set_setting('keyboard.autocorrect', True)

    def test_keyboard_bug_1073870(self):
        self.ui_tests = UiTests(self.marionette)
        self.ui_tests.launch()

        # go to UI/keyboard page
        keyboard_page = self.ui_tests.tap_keyboard_option()
        keyboard_page.switch_to_frame()

        # tap the field "input type=text"
        keyboard = keyboard_page.tap_text_input()

        keyboard.send('Hello worl')

        # set caret position to after Hello
        keyboard_page.switch_to_frame()
        self.marionette.execute_script(
            """var el = document.activeElement;
               el.selectionStart = el.selectionEnd = 5;""")

        keyboard.send(' ')
        keyboard_page.switch_to_frame()
        self.assertEqual(keyboard_page.text_input, 'Hello  worl')
