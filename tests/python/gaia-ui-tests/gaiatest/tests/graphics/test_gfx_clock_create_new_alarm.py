# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest.gaia_graphics_test import GaiaImageCompareTestCase
from gaiatest.apps.clock.app import Clock

class TestClockCreateNewAlarm(GaiaImageCompareTestCase):

    _seconds_since_epoch = 1357043430

    def setUp(self):
        GaiaImageCompareTestCase.setUp(self)
        self.data_layer.set_time(self._seconds_since_epoch * 1000)
        self.data_layer.set_setting('time.timezone', 'Atlantic/Reykjavik')

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
        self.invoke_screen_capture()

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

        alarm_time = self.clock.alarms[0].time()

        # Tap to Edit alarm
        edit_alarm = alarms[0].tap()
        self.invoke_screen_capture()

        time_picker = edit_alarm.tap_time()
        self.invoke_screen_capture(frame='chrome')

        time_picker.spin_hour()
        time_picker.spin_minute()
        time_picker.spin_hour24()
        self.invoke_screen_capture(frame='chrome')

        time_picker.tap_done()

        edit_alarm.tap_done()


    def tearDown(self):
        GaiaImageCompareTestCase.tearDown(self)
