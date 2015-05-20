# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.lockscreen.app import LockScreen


class TestLockScreen(GaiaTestCase):

    _notification_title = 'TestNotificationBar_TITLE'
    _notification_body = 'TestNotificationBar_BODY'

    def setUp(self):
        GaiaTestCase.setUp(self)

        # this time we need it locked!
        self.device.lock()

    def test_lock_screen_notification(self):
        lock_screen = LockScreen(self.marionette)
        lock_screen.switch_to_frame()
        prev_notifications_length = len(lock_screen.notifications)
        self.marionette.execute_script('new Notification("%s", {body: "%s"});'
                                       % (self._notification_title, self._notification_body))
        self.assertEqual(len(lock_screen.notifications), prev_notifications_length + 1)
        # The last added notification is the first in the notifications array
        self.assertTrue(lock_screen.notifications[0].is_visible)
        self.assertEqual(lock_screen.notifications[0].content, self._notification_body)
        self.assertEqual(lock_screen.notifications[0].title, self._notification_title)
