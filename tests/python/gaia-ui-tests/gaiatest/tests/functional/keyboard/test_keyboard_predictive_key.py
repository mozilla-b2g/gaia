# -*- coding: iso-8859-15 -*-
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.ui_tests.app import UiTests


class TestKeyboardPredictiveKey(GaiaTestCase):

    def test_keyboard_predictive_key(self):
        self.ui_tests = UiTests(self.marionette)
        self.ui_tests.launch()

        # go to UI/keyboard page
        keyboard_page = self.ui_tests.tap_keyboard_option()
        keyboard_page.switch_to_frame()

        # tap the field "input type=text"
        keyboard = keyboard_page.tap_text_input()

        # type first 6 letters of the expected word
        keyboard.switch_to_keyboard()
        expected_word = 'keyboard '
        keyboard.send(expected_word[:6])

        # tap the first predictive word
        keyboard.tap_first_predictive_word()
        self.marionette.switch_to_frame()
        self.marionette.switch_to_frame(self.ui_tests.app.frame)
        keyboard_page.switch_to_frame()

        # check if the word in the input field is the same as the expected word
        typed_word = keyboard_page.text_input
        self.assertEqual(typed_word, expected_word)
