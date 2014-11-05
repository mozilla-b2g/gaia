# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time

from marionette.by import By
from gaiatest import GaiaTestCase


class TestScreenManagerAccessibility(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)
        # Set idle timeout to 1 seconds.
        self.data_layer.set_setting('screen.timeout', 1)

    def test_a11y_screen_manager(self):

        # Check if the screen is turned on
        self.assertTrue(self.device.is_screen_enabled)

        # Wait for 11 seconds: screen timeout + dim notice
        time.sleep(11)

        # Check if the screen is turned off
        self.assertFalse(self.device.is_screen_enabled)

        # Turn the screen on again
        self.device.turn_screen_on()

        # Check if the screen is turned on
        self.assertTrue(self.device.is_screen_enabled)

        # Wait 6 seconds
        time.sleep(6)

        # Simulate an accessibility action
        self.accessibility.dispatchEvent()

        # Wait another 5 seconds
        time.sleep(5)

        # Check if the screen is still turned on
        self.assertTrue(self.device.is_screen_enabled)
