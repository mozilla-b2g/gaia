# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
from gaiatest import GaiaTestCase
from gaiatest.apps.clock.app import Clock


class TestClockSetAlarmRepeat(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

        self.clock = Clock(self.marionette)
        self.clock.launch()

    def test_clock_set_alarm_repeat(self):
        """ Modify the alarm repeat

        https://moztrap.mozilla.org/manage/case/1786/
        Test that [Clock][Alarm] Change the repeat state

        """
        new_alarm = self.clock.tap_new_alarm()

        # Ensure repeat has the default value
        self.assertEquals(new_alarm.alarm_repeat, 'Never')

        # Set label
        new_alarm.type_alarm_label("TestSetAlarmRepeat")

        # loop the options and select the ones in match list
        for option in ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']:
            new_alarm.select_repeat(option)

        self.assertEqual('Weekdays', new_alarm.alarm_repeat)

        # check select Sunday twice
        new_alarm.select_repeat('Sunday')
        self.assertEqual('Mon, Tue, Wed, Thu, Fri, Sun', new_alarm.alarm_repeat)

        new_alarm.select_repeat('Sunday')
        self.assertEqual('Weekdays', new_alarm.alarm_repeat)

        # Save the alarm
        new_alarm.tap_done()
        self.clock.wait_for_banner_not_visible()

        # Tap to Edit alarm
        edit_alarm = self.clock.alarms[0].tap()

        # To verify the select list.
        self.assertEqual('Weekdays', edit_alarm.alarm_repeat)

        # Close alarm
        edit_alarm.tap_done()
        self.clock.wait_for_banner_not_visible()
