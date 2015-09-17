# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import PasscodeTestCase
from gaiatest.apps.lockscreen.app import LockScreen
from gaiatest.apps.clock.app import Clock
from gaiatest.apps.clock.regions.alarm_alert import AlarmAlertScreen


class TestClockAlarmInLockscreen(PasscodeTestCase):

    _input_passcode = '1337'

    def setUp(self):
        PasscodeTestCase.setUp(self)

        self.set_passcode_to_1337()

        self.data_layer.set_setting('lockscreen.passcode-lock.enabled', True)

        self.clock = Clock(self.marionette)
        self.clock.launch()

    def test_clock_set_alarm_in_lockscreen(self):
        """ Dismiss alarm in lockscreen
        https://moztrap.mozilla.org/manage/cases/15805/
        """

        alarm_label_text = 'Test Alarm'

        # Set the time on the device so that it starts with 0 seconds
        _seconds_since_epoch = self.marionette.execute_script("""
                var today = new Date();
                var yr = today.getFullYear();
                var mth = today.getMonth();
                var day = today.getDate();
                return new Date(yr, mth, day, 1, 0, 0).getTime();""")
        self.data_layer.set_time(_seconds_since_epoch)

        new_alarm = self.clock.tap_new_alarm()
        new_alarm.type_alarm_label(alarm_label_text)
        time_picker = new_alarm.tap_time()
        time_picker.add_minute()
        time_picker.tap_done()
        self.clock = new_alarm.tap_done()
        self.clock.dismiss_banner()

        self.assertTrue(self.clock.alarms[0].is_alarm_active)

        self.device.lock()

        self.alarm_alert = AlarmAlertScreen(self.marionette)
        self.alarm_alert.wait_for_alarm_to_trigger()

        # Check that the alarm name is the one we set
        self.assertEqual(self.alarm_alert.alarm_label, alarm_label_text)
        self.alarm_alert.tap_stop_alarm()
        self.assertTrue(self.device.is_locked)
