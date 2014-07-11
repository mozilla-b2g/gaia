# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.clock.app import Clock
from gaiatest.apps.clock.regions.alarm_alert import AlarmAlertScreen


class TestClockCreateNewAlarm(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

        _seconds_since_epoch = self.marionette.execute_script("""
                var today = new Date();
                var yr = today.getFullYear();
                var mth = today.getMonth();
                var day = today.getDate();
                return new Date(yr, mth, day, 1, 0, 0).getTime();""")
        self.data_layer.set_time(_seconds_since_epoch)

        self.clock = Clock(self.marionette)
        self.clock.launch()

    def test_clock_create_new_alarm(self):
        """ Add an alarm and set label of the new alarm
        https://moztrap.mozilla.org/manage/case/1772/
        https://moztrap.mozilla.org/manage/case/1775/
        """

        alarm_label_text = "test4321"

        # get the number of alarms set, before adding the new alarm
        initial_alarms_count = len(self.clock.alarms)

        # create a new alarm with the default values that are available
        new_alarm = self.clock.tap_new_alarm()

        # Ensure label has the default placeholder and text
        self.assertEquals(new_alarm.alarm_label_placeholder, 'Alarm name')

        # set label
        new_alarm.type_alarm_label(alarm_label_text)
        self.clock = new_alarm.tap_done()

        # verify the banner-countdown message appears
        alarm_msg = self.clock.banner_notification
        self.assertTrue('The alarm is set for' in alarm_msg, 'Actual banner message was: "' + alarm_msg + '"')
        self.clock.dismiss_banner()

        # ensure the new alarm has been added and is displayed
        self.assertTrue(initial_alarms_count < len(self.clock.alarms),
                        'Alarms count did not increment')

        # verify the label of alarm
        alarms = self.clock.alarms
        self.assertEqual(len(alarms), 1)
        self.assertEqual(alarms[0].label, alarm_label_text)

        # Tap to Edit alarm
        edit_alarm = alarms[0].tap()

        edit_alarm.tap_time()
        self.marionette.switch_to_frame()
        edit_alarm.spin_minute()
        edit_alarm.confirm_alarm_time()
        self.apps.switch_to_displayed_app()

        edit_alarm.tap_done()
        self.clock.dismiss_banner()

        # turn off the alarm
        self.clock.alarms[0].tap_checkbox()
        self.clock.alarms[0].wait_for_checkbox_to_change_state(False)
        self.assertFalse(self.clock.alarms[0].is_alarm_active, 'user should be able to turn on the alarm.')

        # turn on the alarm
        self.clock.alarms[0].tap_checkbox()
        self.clock.dismiss_banner()
        self.assertTrue(self.clock.alarms[0].is_alarm_active, 'user should be able to turn off the alarm.')

        self.device.touch_home_button()
        self.marionette.switch_to_frame()

        self.alarm_alert = AlarmAlertScreen(self.marionette)
        self.alarm_alert.wait_for_alarm_to_trigger()

        self.assertEqual(self.alarm_alert.alarm_label, alarm_label_text)
        self.alarm_alert.tap_stop_alarm()

        # Switch back to top level now that Clock app is gone
        self.wait_for_condition(lambda m: self.apps.displayed_app.name == 'Homescreen')
