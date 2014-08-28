# -*- coding: iso-8859-15 -*-
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.ui_tests.app import UiTests


class TestA11yKeyboardWordSuggestions(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)
        # enable auto-correction of keyboard
        self.data_layer.set_setting('keyboard.autocorrect', True)

    def test_a11y_keyboard_word_suggestions(self):
        self.ui_tests = UiTests(self.marionette)
        self.ui_tests.launch()

        # go to UI/keyboard page
        keyboard_page = self.ui_tests.tap_keyboard_option()
        keyboard_page.switch_to_frame()

        # tap the field "input type=text"
        keyboard = keyboard_page.tap_text_input()

        # type first 6 letters of the expected word
        expected_word = 'keyboard'
        keyboard.send(expected_word[:6])

        keyboard.switch_to_keyboard()

        # check that suggestions area has proper accessibility name
        self.assertEqual(keyboard.a11y_candidate_panel_name, 'Word suggestions')

        # check that suggestions list has proper accessibility role
        self.assertEqual(keyboard.a11y_suggestions_container_role, 'listbox')

        # check that word suggestion has proper accessibility role and name
        self.assertEqual(
            keyboard.a11y_first_predictive_word_name, expected_word.strip())
        self.assertEqual(
            keyboard.a11y_first_predictive_word_role, 'listbox option')

        # check that suggestions dismiss has proper accessibility role and name
        self.assertEqual(keyboard.a11y_dismiss_suggestions_button_name, 'Dismiss')
        self.assertEqual(keyboard.a11y_dismiss_suggestions_button_role, 'pushbutton')

        # check that word suggestion can be selected via accessibility API
        keyboard.a11y_first_predictive_word_click()
        self.apps.switch_to_displayed_app()
        keyboard_page.switch_to_frame()

        # check if the word in the input field is the same as the expected word
        typed_word = keyboard_page.text_input
        self.assertEqual(typed_word, expected_word)
