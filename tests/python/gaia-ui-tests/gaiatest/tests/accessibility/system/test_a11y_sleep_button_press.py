# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time

from marionette.by import By
from gaiatest import GaiaTestCase


class TestSleepButtonPressAccessibility(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

    def test_a11y_sleep_button_press(self):

        # print self.data_layer.get_setting('accessibility.screenreader')
        # Screen reader is currently disabled.
        self.assertFalse(self.data_layer.get_setting('accessibility.screenreader'))

        # print self.data_layer.get_setting('accessibility.screenreader')

        for count in range(0, 6):
            self.device.press_sleep_button()

        # Screen reader is now enabled.
        self.assertTrue(self.data_layer.get_setting('accessibility.screenreader'))

        for count in range(0, 6):
            self.device.press_sleep_button()

        # Screen reader is disabled again.
        self.assertFalse(self.data_layer.get_setting('accessibility.screenreader'))

        # Press the sleep button 2 times, then wait for more than 0.5s
        for count in range(0, 2):
            self.device.press_sleep_button()
        time.sleep(1.1)
        for count in range(0, 4):
            self.device.press_sleep_button()
        # Screen reader should still be disabled.
        self.assertFalse(self.data_layer.get_setting('accessibility.screenreader'))

        self.device.press_sleep_button()
        # Wait for more than 0.5s after the initial 3 presses.
        time.sleep(1.1)
        self.device.press_sleep_button()
        # Screen reader should still be disabled.
        self.assertFalse(self.data_layer.get_setting('accessibility.screenreader'))

        for count in range(0, 3):
            self.device.press_sleep_button()
        time.sleep(2.5)
        for count in range(0, 3):
            self.device.press_sleep_button()
        # Screen reader is now enabled.
        self.assertTrue(self.data_layer.get_setting('accessibility.screenreader'))
