# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.lockscreen.app import LockScreen


class TestLockScreenNotification(GaiaTestCase):

    _notification_title = 'TestNotificationBar_TITLE'
    _notification_body = 'TestNotificationBar_BODY'

    def setUp(self):
        GaiaTestCase.setUp(self)

        self.device.lock()
        self.device.turn_screen_off()

    def test_lock_screen_wake_with_notification(self):
        lock_screen = LockScreen(self.marionette)
        # Check if the screen is turned off
        self.assertFalse(self.device.is_screen_enabled)
        self.marionette.switch_to_frame()
        self.marionette.execute_script('new Notification("%s", {body: "%s"});'
                                       % (self._notification_title, self._notification_body))
        lock_screen.switch_to_frame()
        lock_screen.wait_for_notification()
        self.marionette.switch_to_frame()

        # Check if the screen is turned on
        self.assertTrue(self.device.is_screen_enabled)
        lock_screen.switch_to_frame()

        # Check if the notification is displayed on the screen
        self.assertTrue(lock_screen.notifications[0].is_visible)
        self.assertEqual(lock_screen.notifications[0].content, self._notification_body)
