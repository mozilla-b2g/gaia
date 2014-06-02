# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time

from marionette.by import By
from gaiatest import GaiaTestCase


class TestVolumeButtonsAccessibility(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

    def test_a11y_volume_buttons(self):

        # Screen reader is currently disabled.
        self.assertFalse(self.data_layer.get_setting('accessibility.screenreader'))

        self.device.press_release_volume_up_then_down_n_times(3)
        time.sleep(3)
        self.device.press_release_volume_up_then_down_n_times(3)

        # Screen reader is now enabled.
        self.assertTrue(self.data_layer.get_setting('accessibility.screenreader'))

        self.device.press_release_volume_up_then_down_n_times(3)
        time.sleep(3)
        self.device.press_release_volume_up_then_down_n_times(3)

        # Screen reader is disabled again.
        self.assertFalse(self.data_layer.get_setting('accessibility.screenreader'))

        # Press the volume up/down buttons 2 times, then wait for more than 0.6s
        self.device.press_release_volume_up_then_down_n_times(2)
        time.sleep(0.7)
        self.device.press_release_volume_up_then_down_n_times(4)
        # Screen reader should still be disabled.
        self.assertFalse(self.data_layer.get_setting('accessibility.screenreader'))

        self.device.press_release_volume_up_then_down_n_times(1)
        # Wait for more than 0.6s after the initial 5 presses.
        time.sleep(0.7)
        self.device.press_release_volume_up_then_down_n_times(1)
        # Screen reader should still be disabled.
        self.assertFalse(self.data_layer.get_setting('accessibility.screenreader'))
