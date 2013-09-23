# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.clock.app import Clock


class TestClockCreateNewAlarm(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

        self.clock = Clock(self.marionette)
        self.clock.launch()

    def test_clock_create_new_alarm(self):
        """ Add an alarm
        https://moztrap.mozilla.org/manage/case/1772/
        """

        # Get the number of alarms set, before adding the new alarm
        initial_alarms_count = len(self.clock.alarms)

        # create a new alarm with the default values that are available
        new_alarm = self.clock.tap_new_alarm()
        self.clock = new_alarm.tap_done()

        # verify the banner-countdown message appears
        alarm_msg = self.clock.banner_countdown_notification
        self.assertTrue('The alarm is set for' in alarm_msg, 'Actual banner message was: "' + alarm_msg + '"')

        # Get the number of alarms set after the new alarm was added

        # Ensure the new alarm has been added and is displayed
        self.assertTrue(initial_alarms_count < len(self.clock.alarms),
                        'Alarms count did not increment')

    def test_clock_set_alarm_label(self):
        """ Set label of the new alarm

        https://moztrap.mozilla.org/manage/case/1775/

        """

        alarm_label_text = "test4321"
        # create a new alarm with the default values that are available
        new_alarm = self.clock.tap_new_alarm()

        # set label
        new_alarm.type_alarm_label(alarm_label_text)

        # save the alarm
        self.clock = new_alarm.tap_done()
        self.clock.wait_for_banner_not_visible()

        # verify the label of alarm
        alarms = self.clock.alarms
        self.assertEqual(len(alarms), 1)
        self.assertEqual(alarms[0].label, alarm_label_text)
