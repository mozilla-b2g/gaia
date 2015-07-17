# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.settings.app import Settings
from gaiatest.apps.lockscreen.app import LockScreen


class TestSettingsPasscode(GaiaTestCase):

    # Input data
    _input_passcode = ['1', '3', '3', '7']

    def test_set_passcode_by_settings(self):
        settings = Settings(self.marionette)
        settings.launch()
        screen_lock_settings = settings.open_screen_lock()

        screen_lock_settings.enable_lockscreen()
        screen_lock_settings.enable_passcode_lock()
        screen_lock_settings.create_passcode(self._input_passcode)

        passcode_enabled = self.data_layer.get_setting('lockscreen.passcode-lock.enabled')
        self.assertEqual(passcode_enabled, True, 'Passcode is not enabled.')

        # test new passcode by locking and unlocking
        self.device.lock()
        lock_screen = LockScreen(self.marionette)
        lock_screen.switch_to_frame()
        passcode_pad = lock_screen.unlock_to_passcode_pad()
        passcode_pad.type_passcode(self._input_passcode)
        self.wait_for_condition(lambda _: self.apps.displayed_app.name ==
                                          settings.name)
