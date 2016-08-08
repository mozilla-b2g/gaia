# -*- coding: iso-8859-15 -*-
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette import expected
from marionette import Wait
from marionette.by import By
from gaiatest import GaiaTestCase
from gaiatest.apps.ui_tests.app import UiTests


class TestKeyboardPredictiveKey(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)
        # enable auto-correction of keyboard
        self.data_layer.set_setting('keyboard.autocorrect', True)

    def test_keyboard_predictive_key(self):
        self.ui_tests = UiTests(self.marionette)
        self.ui_tests.launch()

        # go to UI/keyboard page
        keyboard_page = self.ui_tests.tap_keyboard_option()
        keyboard_page.switch_to_frame()

        # tap the field "input type=text"
        keyboard = keyboard_page.tap_text_input()

        # type first 7 letters of the expected word
        expected_word = 'keyboard'
        keyboard.send(expected_word[:7])

        # tap the first predictive word
        keyboard.tap_first_predictive_word()
        self.apps.switch_to_displayed_app()
        keyboard_page.switch_to_frame()

        # check if the word in the input field is the same as the expected word
        typed_word = keyboard_page.text_input
        Wait(self.marionette).until(lambda m: typed_word == expected_word)

        ## TEST 2, tap second suggestion, then press space
        keyboard.send(' ')
        keyboard_page.switch_to_frame()

        # type some misspelled word
        keyboard.send('Tes')
        keyboard_page.switch_to_frame()
        Wait(self.marionette).until(lambda m: keyboard_page.text_input == 'keyboard Tes')

        # tap second predictive word (tea)
        keyboard.tap_suggestion('Tea')
        self.apps.switch_to_displayed_app()

        # Send space
        keyboard.send(' ')
        keyboard_page.switch_to_frame()

        # Output should be 'Tea '
        Wait(self.marionette).until(lambda m: keyboard_page.text_input == 'keyboard Tea ')

        ## TEST 3 - type something with autocorrect and press space
        keyboard.send('ye ')
        keyboard_page.switch_to_frame()
        Wait(self.marionette).until(lambda m: keyboard_page.text_input == 'keyboard Tea he ')

        # TEST 4 - autocorrect, dot and backspace
        keyboard.send('wot.')
        keyboard_page.switch_to_frame()
        Wait(self.marionette).until(lambda m: keyboard_page.text_input == 'keyboard Tea he wit.')

        keyboard.tap_backspace()
        keyboard_page.switch_to_frame()
        Wait(self.marionette).until(lambda m: keyboard_page.text_input == 'keyboard Tea he wot')

