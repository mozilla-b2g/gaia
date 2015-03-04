# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import Wait

from gaiatest.apps.lockscreen.app import LockScreen
from gaiatest.gaia_graphics_test import GaiaImageCompareTestCase


class TestLockScreen(GaiaImageCompareTestCase):

    _notification_title = 'TestNotificationBar_TITLE'
    _notification_body = 'TestNotificationBar_BODY'
    _seconds_since_epoch = 1357043430

    def setUp(self):
        GaiaImageCompareTestCase.setUp(self)

        self.data_layer.set_time(self._seconds_since_epoch * 1000)
        self.data_layer.set_setting('time.timezone', 'Atlantic/Reykjavik')
        # this time we need it locked!
        self.device.lock()

    def test_lockscreen_notification(self):

        # the lockscreen should display the carrier name
        Wait(self.marionette, timeout=30).until(lambda m: self.device.has_mobile_connection)

        lock_screen = LockScreen(self.marionette)
        lock_screen.switch_to_frame()
        self.marionette.execute_script('new Notification("%s", {body: "%s"});'
                                       % (self._notification_title, self._notification_body))
        self.marionette.execute_script('new Notification("%s", {body: "%s"});'
                                       % (self._notification_title + "_2", self._notification_body + "_2"))
        self.marionette.execute_script('new Notification("%s", {body: "%s"});'
                                       % (self._notification_title + "_3", self._notification_body + "_3"))
        Wait(self.marionette).until(lambda m: len(lock_screen.notifications) == 3)

        # wait until device is off and turn back on
        Wait(self.marionette, timeout=20).until(
            lambda m: not self.device.is_screen_enabled)
        self.device.turn_screen_on()
        self.take_screenshot()
