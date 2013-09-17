# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.clock.app import Clock


class TestClockAddAlarmMultipleTimes(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

        self.clock = Clock(self.marionette)
        self.clock.launch()

    def test_clock_add_alarm_multiple_times(self):
        """ Add multiple alarm

        https://moztrap.mozilla.org/manage/case/1773/

        """

        count = 3
        for i in range(1, count + 1):

            # create a new alarm with the default values that are available
            new_alarm = self.clock.tap_new_alarm()
            new_alarm.tap_done()

            # verify the banner-countdown message appears
            alarm_msg = self.clock.banner_countdown_notification
            self.assertIn('The alarm is set for', alarm_msg)
            self.clock.wait_for_banner_not_visible()

            # Ensure the new alarm has been added and is displayed
            self.assertEqual(i, len(self.clock.alarms))
