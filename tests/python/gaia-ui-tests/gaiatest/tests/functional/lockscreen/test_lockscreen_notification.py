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
        self.lockscreen.lock()
        self.lock_screen = LockScreen(self.marionette)

    def test_lock_screen_notification(self):

        self.marionette.execute_script('navigator.mozNotification.createNotification("%s", "%s").show();'
                                       % (self._notification_title, self._notification_body))

        self.assertEqual(len(self.lock_screen.notifications), 1)
        self.assertTrue(self.lock_screen.notifications[0].is_visible)
        self.assertEqual(self.lock_screen.notifications[0].content, self._notification_body)
        self.assertEqual(self.lock_screen.notifications[0].title, self._notification_title)
