# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.settings.app import Settings


class TestSettingsPasscode(GaiaTestCase):

    # Input data
    _input_passcode = ['7', '9', '3', '1']

    def test_set_passcode_by_settings(self):
        settings = Settings(self.marionette)
        settings.launch()
        screen_lock_settings = settings.open_screen_lock_settings()

        screen_lock_settings.enable_lockscreen()
        screen_lock_settings.enable_passcode_lock()
        screen_lock_settings.create_passcode(self._input_passcode)

        passcode_code = self.data_layer.get_setting('lockscreen.passcode-lock.code')
        passcode_enabled = self.data_layer.get_setting('lockscreen.passcode-lock.enabled')
        self.assertEqual(passcode_code, "".join(self._input_passcode), 'Passcode is "%s", not "%s"' % (passcode_code, "".join(self._input_passcode)))
        self.assertEqual(passcode_enabled, True, 'Passcode is not enabled.')
