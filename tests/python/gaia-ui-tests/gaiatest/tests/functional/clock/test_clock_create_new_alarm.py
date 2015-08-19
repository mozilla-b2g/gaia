# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.clock.app import Clock
from gaiatest.apps.clock.regions.alarm_alert import AlarmAlertScreen
from gaiatest.apps.homescreen.app import Homescreen


class TestClockCreateNewAlarm(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)


        self.clock = Clock(self.marionette)
        self.clock.launch()

    def test_clock_create_new_alarm(self):
        """ Add an alarm and set label of the new alarm
        https://moztrap.mozilla.org/manage/case/1772/
        https://moztrap.mozilla.org/manage/case/1775/
        """
        alarm_view = self.clock.switch_view("alarm")
        _seconds_since_epoch = self.marionette.execute_script("""
                var today = new Date();
                var yr = today.getFullYear();
                var mth = today.getMonth();
                var day = today.getDate();
                return new Date(yr, mth, day, 1, 0, 0).getTime();""")

        alarm_label_text = "test4321"

        initial_alarms_count = len(alarm_view.alarm_items)

        # Set the time on the device
        self.data_layer.set_time(_seconds_since_epoch)

        # create a new alarm with the default values that are available
        new_alarm = alarm_view.tap_new_alarm()

        # Ensure label has the default placeholder and text
        self.assertEquals(new_alarm.alarm_label_placeholder, 'Alarm name')

        # set label
        new_alarm.type_alarm_label(alarm_label_text)
        alarm_view = new_alarm.tap_done()

        # verify the banner-countdown message appears
        alarm_msg = alarm_view.banner_notification
        self.assertTrue('The alarm is set for' in alarm_msg, 'Actual banner message was: "' + alarm_msg + '"')
        alarm_view.dismiss_banner()

        # ensure the new alarm has been added and it is displayed
        self.assertTrue(initial_alarms_count < len(alarm_view.alarm_items),
                        'Alarms count did not increment')

        # verify the label of alarm
        alarms = alarm_view.alarm_items
        self.assertEqual(len(alarms), 1)
        self.assertEqual(alarms[0].label, alarm_label_text)

        alarm_time = alarm_view.alarm_items[0].time()

        # tap to Edit alarm
        edit_alarm = alarms[0].tap()

        # Set the alarm time to 1 min more than the current time
        time_picker = edit_alarm.tap_time()
        time_picker.add_minute()
        time_picker.tap_done()

        edit_alarm.tap_done()
        alarm_view.dismiss_banner()

        self.assertNotEqual(alarm_view.alarm_items[0].time, alarm_time)

        # turn off the alarm
        alarm_view.alarm_items[0].tap_checkbox()
        alarm_view.alarm_items[0].wait_for_checkbox_to_change_state(False)
        self.assertFalse(alarm_view.alarm_items[0].is_alarm_active, 'user should be able to turn on the alarm.')

        # turn on the alarm
        alarm_view.alarm_items[0].tap_checkbox()
        alarm_view.dismiss_banner()
        self.assertTrue(alarm_view.alarm_items[0].is_alarm_active, 'user should be able to turn off the alarm.')

        self.device.touch_home_button()
        self.marionette.switch_to_frame()

        self.alarm_alert = AlarmAlertScreen(self.marionette)
        self.alarm_alert.wait_for_alarm_to_trigger()

        # Check that the alarm name is the one we set
        self.assertEqual(self.alarm_alert.alarm_label, alarm_label_text)
        self.alarm_alert.tap_stop_alarm()

        # Switch back to top level now that Clock app is gone
        self.wait_for_condition(lambda m: self.apps.displayed_app.name == Homescreen.name)
