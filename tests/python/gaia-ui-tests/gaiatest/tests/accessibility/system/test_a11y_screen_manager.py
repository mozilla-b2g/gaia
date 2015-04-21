# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import Wait
from marionette_driver.errors import TimeoutException

from gaiatest import GaiaTestCase


SCREEN_TIMEOUT = 1
TIMEOUT_TOLERANCE = 10


class screen_disabled(object):

    def __init__(self, device, interrupt=None):
        self.device = device
        self.interrupt = interrupt

    def __call__(self, marionette):
        if self.interrupt is not None:
            self.interrupt()
        return not self.device.is_screen_enabled


class TestScreenManagerAccessibility(GaiaTestCase):

    def modify_settings(self, settings):
        settings['screen.timeout'] = SCREEN_TIMEOUT
        return settings

    def test_a11y_screen_manager(self):
        timeout = SCREEN_TIMEOUT + TIMEOUT_TOLERANCE
        self.device.turn_screen_on()
        Wait(self.marionette, timeout).until(screen_disabled(self.device))
        self.device.turn_screen_on()
        with self.assertRaises(TimeoutException):
            Wait(self.marionette, timeout).until(screen_disabled(
                self.device, interrupt=self.accessibility.dispatchEvent))
