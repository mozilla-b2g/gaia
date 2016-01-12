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
        # Added a view switching method to app.py for getting a Clock object.
        alarm = self.clock.switch_view('alarm')

        new_alarm = alarm.tap_new_alarm()

        self.assertEquals(new_alarm.alarm_repeat, 'never')

        # Set label
        new_alarm.type_alarm_label("TestSetAlarmRepeat")

        # Loop the options and select the ones in match list
        for option in ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']:
            new_alarm.select_repeat(option)

        self.assertEqual(new_alarm.alarm_repeat, 'weekdays')

        new_alarm.select_repeat('Sunday')
        # In this locale, Sunday is the first day of the week; it appears first.
        self.assertEqual(new_alarm.alarm_repeat, 'Sun, Mon, Tue, Wed, Thu, Fri')

        new_alarm.select_repeat('Sunday')
        self.assertEqual(new_alarm.alarm_repeat, 'weekdays')

        # Ensure sound has the default value
        self.assertEquals(new_alarm.alarm_sound, 'ac_awake_opus')

        # Set sound
        new_alarm.select_sound('Digicloud')
        self.assertEqual(new_alarm.alarm_sound, 'ac_digicloud_opus')

        # Ensure snooze has the default value
        self.assertIn('10', new_alarm.alarm_snooze)

        # Set snooze
        new_alarm.select_snooze('15 minutes')
        self.assertIn('15', new_alarm.alarm_snooze)

        # Save the alarm
        alarm_view = new_alarm.tap_done()
        alarm_view.dismiss_banner()

        # Tap to Edit alarm
        edit_alarm = alarm_view.alarm_items[0].tap()

        # Verify selected options
        self.assertEqual(edit_alarm.alarm_repeat, 'weekdays')
        self.assertEqual(new_alarm.alarm_sound, 'ac_digicloud_opus')
        self.assertIn('15', new_alarm.alarm_snooze)

        edit_alarm.tap_done()
        alarm_view.dismiss_banner()
