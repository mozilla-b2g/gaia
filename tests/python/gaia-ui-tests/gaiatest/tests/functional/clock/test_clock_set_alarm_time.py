# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
from gaiatest import GaiaTestCase
from gaiatest.apps.clock.app import Clock


class TestClockSetAlarmTime(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

        self.clock = Clock(self.marionette)
        self.clock.launch()

    def test_clock_set_alarm_time(self):
        """ Modify the alarm time

        https://moztrap.mozilla.org/manage/case/1784/
        """

        new_alarm = self.clock.tap_new_alarm()

        # set label
        new_alarm.type_alarm_label("TestSetAlarmTime")

        # Save the alarm
        new_alarm.tap_done()
        self.clock.wait_for_banner_not_visible()

        old_alarm_text = self.clock.alarms[0].time

        # Tap to Edit alarm
        edit_alarm = self.clock.alarms[0].tap()

        # Set alarm time
        edit_alarm.tap_time()
        self.marionette.switch_to_frame()
        edit_alarm.spin_hour()
        edit_alarm.spin_minute()
        edit_alarm.spin_hour24()

        edit_alarm.tap_done()
        self.clock.wait_for_banner_not_visible()

        # Verify Result
        # Get the number of alarms set after the new alarm was added
        # Ensure that there is only one alarm
        self.assertEqual(1, len(self.clock.alarms))

        # Verify label
        self.assertEqual("TestSetAlarmTime", self.clock.alarms[0].label)

        # Verify that alarm time has been changed
        new_alarm_text = self.clock.alarms[0].time
        self.assertNotEqual(old_alarm_text, new_alarm_text)
