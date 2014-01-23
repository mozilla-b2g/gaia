# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.ui_tests_privileged.app import UiTestsPivileged
from gaiatest.apps.homescreen.regions.permission_dialog import PermissionDialog


class TestPrivilegedAppAudioCapturePrompt(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

    def test_audio_capture_prompt(self):
        uiTestsPrivileged = UiTestsPivileged(self.marionette)
        uiTestsPrivileged.launch()

        user_media = uiTestsPrivileged.tap_get_user_media_option()
        user_media.switch_to_frame()
        user_media.tap_audio1_button()

        permission = PermissionDialog(self.marionette)
        self.marionette.switch_to_default_content()
        permission.wait_for_permission_dialog_displayed()

        self.assertEqual(permission.permission_dialog_message,
                         u'Would you like to share your microphone with UI tests - Privileged App?')

        permission.tap_to_confirm_permission()

        current_permission = self.apps.get_permission('UI tests - Privileged App', 'audio-capture')
        self.assertEqual(current_permission, 'prompt')
