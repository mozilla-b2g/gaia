# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
from gaiatest import GaiaTestCase
from gaiatest.apps.clock.app import Clock


class TestClockSetAlarmSnooze(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

        self.clock = Clock(self.marionette)
        self.clock.launch()

    def test_clock_set_alarm_snooze(self):
        """ Modify the alarm snooze

        Test that [Clock][Alarm] Change the snooze time
        https://moztrap.mozilla.org/manage/case/1788/
        """

        new_alarm = self.clock.tap_new_alarm()

        # Ensure snooze has the default value
        self.assertEquals(new_alarm.alarm_snooze, '5 minutes')

        # Set label & snooze
        new_alarm.type_alarm_label("TestSetAlarmSnooze")
        new_alarm.select_snooze("15 minutes")

        self.assertEqual("15 minutes", new_alarm.alarm_snooze)

        # Save the alarm
        new_alarm.tap_done()
        self.clock.wait_for_banner_not_visible()

        # Tap to Edit alarm
        edit_alarm = self.clock.alarms[0].tap()

        # to verify the select list.
        self.assertEqual("15 minutes", new_alarm.alarm_snooze)

        # Close alarm
        edit_alarm.tap_done()
        self.clock.wait_for_banner_not_visible()
