# -*- coding: iso-8859-15 -*-
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time

from gaiatest import GaiaTestCase


class TestKeyboard(GaiaTestCase):

    # UI Tests app locators
    _test_keyboard_link_locator = ('link text', 'Keyboard test')
    _text_input_locator = ('css selector', "input[type='text']")

    _number_input_locator = ('css selector', "input[type='number']")

    _test_page_frame_locator = ('id', 'test-iframe')

    _test_string = "aG1D2s3~!=@.#$^"
    # Temporarily, long press work, but special characters selection fail
    _final_string = "aG1D2s3~!=@.#$A"

    def setUp(self):
        GaiaTestCase.setUp(self)

        # unlock the lockscreen if it's locked
        self.lockscreen.unlock()

        # launch the UI Tests app
        self.app = self.apps.launch('UI tests')

    def test_keyboard_basic(self):

        # wait for app to load
        self.wait_for_element_displayed(*self._test_keyboard_link_locator)

        # click/load the Keyboard test page
        self.marionette.find_element(*self._test_keyboard_link_locator).click()

        test_page_frame = self.marionette.find_element(*self._test_page_frame_locator)
        self.marionette.switch_to_frame(test_page_frame)

        self.wait_for_element_displayed(*self._text_input_locator)
        self.marionette.find_element(*self._text_input_locator).click()

        self.keyboard.send(self._test_string)
        self.keyboard.tap_backspace()
        self.keyboard.enable_caps_lock()
        self.keyboard.long_press('A')

        self.marionette.switch_to_frame(self.app.frame)

        self.wait_for_element_present(*self._test_page_frame_locator)
        test_page_frame = self.marionette.find_element(*self._test_page_frame_locator)
        self.marionette.switch_to_frame(test_page_frame)

        self.wait_for_element_displayed(*self._text_input_locator)
        output_text = self.marionette.find_element(*self._text_input_locator).get_attribute("value")

        self.assertEqual(self._final_string, output_text)
