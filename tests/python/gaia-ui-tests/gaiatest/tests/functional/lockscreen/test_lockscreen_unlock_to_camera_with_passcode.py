# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.lockscreen.app import LockScreen


class TestCameraUnlockWithPasscode(GaiaTestCase):

    # Input data
    _input_passcode = '7931'

    def setUp(self):
        GaiaTestCase.setUp(self)

        # Turn off geolocation prompt
        self.apps.set_permission('Camera', 'geolocation', 'deny')

        self.data_layer.set_setting('lockscreen.passcode-lock.code', self._input_passcode)
        self.data_layer.set_setting('lockscreen.passcode-lock.enabled', True)

        # this time we need it locked!
        self.device.lock()

    def test_unlock_to_camera_with_passcode(self):
        # https://github.com/mozilla/gaia-ui-tests/issues/479
        lock_screen = LockScreen(self.marionette)
        camera = lock_screen.unlock_to_camera()

        # Bug 965806 - test_lockscreen_unlock_to_camera_with_passcode.TestCameraUnlockWithPasscode is failing after Bug 951978
        # lock_screen.wait_for_lockscreen_not_visible()

        self.assertTrue(self.device.is_locked)

        camera.switch_to_camera_frame()

        self.assertFalse(camera.is_gallery_button_visible)

        camera.tap_switch_source()

        self.assertFalse(camera.is_gallery_button_visible)
