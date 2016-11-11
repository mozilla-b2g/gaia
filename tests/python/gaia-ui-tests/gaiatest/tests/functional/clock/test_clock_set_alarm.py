# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
from gaiatest import GaiaTestCase
from gaiatest.apps.clock.app import Clock


class TestClockSetAlarm(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

        self.clock = Clock(self.marionette)
        self.clock.launch()

    def test_clock_set_alarm(self):

        new_alarm = self.clock.tap_new_alarm()

        # Ensure repeat has the default value
        self.assertEquals(new_alarm.alarm_repeat, 'Never')

        # Set label
        new_alarm.type_alarm_label("TestSetAlarmRepeat")

        # Loop the options and select the ones in match list
        for option in ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']:
            new_alarm.select_repeat(option)

        self.assertEqual('Weekdays', new_alarm.alarm_repeat)

        # Check select Sunday twice
        new_alarm.select_repeat('Sunday')
        self.assertEqual('Mon, Tue, Wed, Thu, Fri, Sun', new_alarm.alarm_repeat)

        new_alarm.select_repeat('Sunday')
        self.assertEqual('Weekdays', new_alarm.alarm_repeat)

        # Ensure sound has the default value
        self.assertEquals(new_alarm.alarm_sound, 'Classic Buzz')

        # Set sound
        new_alarm.select_sound('Gem Echoes')
        self.assertEqual('Gem Echoes', new_alarm.alarm_sound)

        # Ensure snooze has the default value
        self.assertEquals(new_alarm.alarm_snooze, '5 minutes')

        # Set snooze
        new_alarm.select_snooze('15 minutes')
        self.assertEqual('15 minutes', new_alarm.alarm_snooze)

        # Save the alarm
        new_alarm.tap_done()
        self.clock.dismiss_banner()

        # Tap to Edit alarm
        edit_alarm = self.clock.alarms[0].tap()

        # Verify selected options
        self.assertEqual('Weekdays', edit_alarm.alarm_repeat)
        self.assertEqual('Gem Echoes', new_alarm.alarm_sound)
        self.assertEqual('15 minutes', new_alarm.alarm_snooze)

        edit_alarm.tap_done()
        self.clock.dismiss_banner()
