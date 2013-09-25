# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

# Approximate runtime per 100 iterations: 35 minutes
import time

from gaiatest import GaiaEnduranceTestCase
from gaiatest.apps.clock.app import Clock


class TestEnduranceSetAlarm(GaiaEnduranceTestCase):

    def setUp(self):
        GaiaEnduranceTestCase.setUp(self)

        # Launch the Clock app
        self.clock = Clock(self.marionette)
        self.clock.launch()

        # Bug 864945, UI is not updating unless restart the app
        self.app_under_test = "clock"
        self.close_app()
        time.sleep(2)
        self.clock.launch()
        self.initial_alarms_count = len(self.clock.alarms)

    def test_endurance_set_alarm(self):
        self.drive(test=self.set_alarm, app='clock')

    def set_alarm(self):
        # Set a new alarm and verify; code taken from existing clock tests

        # Create a new alarm with the default values except unique label
        new_alarm = self.clock.tap_new_alarm()
        text = "%d of %d" %(self.iteration, self.iterations)
        new_alarm.type_alarm_label(text)
        self.clock = new_alarm.tap_done()

        # Verify the banner-countdown message appears
        alarm_msg = self.clock.banner_countdown_notification
        self.assertTrue('The alarm is set for' in alarm_msg, 'Actual banner message was: "' + alarm_msg + '"')
        time.sleep(2)

        # Ensure all of the new alarms were added
        if self.iteration == self.iterations:
            alarms = self.clock.alarms
            self.assertEqual(len(alarms), self.initial_alarms_count + self.iteration, 'Alarms count did not increment')

        # A bit of sleep between reps
        time.sleep(3)
