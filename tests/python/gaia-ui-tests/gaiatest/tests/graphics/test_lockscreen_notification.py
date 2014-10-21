# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest.apps.lockscreen.app import LockScreen
from gaiatest.gaia_graphics_test import GaiaImageCompareTestCase
import pdb

class TestLockScreen(GaiaImageCompareTestCase):

    _notification_title = 'TestNotificationBar_TITLE'
    _notification_body = 'TestNotificationBar_BODY'
    _seconds_since_epoch = 1357043430

    def setUp(self):
        GaiaImageCompareTestCase.setUp(self)

        self.data_layer.set_time(self._seconds_since_epoch * 1000)

        # this time we need it locked!
        self.device.lock()

    def test_lock_screen_notification(self):
        pdb.set_trace()

        lock_screen = LockScreen(self.marionette)
        lock_screen.switch_to_frame()
        self.marionette.execute_script('new Notification("%s", {body: "%s"});'
                                       % (self._notification_title, self._notification_body))
        self.marionette.execute_script('new Notification("%s", {body: "%s"});'
                                       % (self._notification_title + "_2", self._notification_body + "_2"))
        self.marionette.execute_script('new Notification("%s", {body: "%s"});'
                                       % (self._notification_title + "_3", self._notification_body + "_3"))

        self.assertEqual(len(lock_screen.notifications), 3)
        self.invoke_screen_capture()

    def tearDown(self):

        GaiaImageCompareTestCase.tearDown(self)
