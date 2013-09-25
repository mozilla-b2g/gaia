# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.clock.app import Clock


class TestClockDeleteAlarm(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

        self.clock = Clock(self.marionette)
        self.clock.launch()

        # create a new alarm with the default values that are available
        new_alarm = self.clock.tap_new_alarm()
        self.clock = new_alarm.tap_done()
        self.clock.wait_for_banner_not_visible()

    def test_clock_delete_alarm(self):
        """ Delete alarm
        https://moztrap.mozilla.org/manage/case/1783/
        """

        # find the origin alarms' number
        initial_alarms_count = len(self.clock.alarms)

        # edit alarm
        edit_alarm = self.clock.alarms[0].tap()

        # delete alarm
        self.clock = edit_alarm.tap_delete()

        # wait alarm item not displayed
        self.clock.wait_for_new_alarm_button()
        self.wait_for_condition(lambda m: len(self.clock.alarms) != initial_alarms_count)

        self.assertEqual(len(self.clock.alarms), initial_alarms_count - 1, "delete alarm failed.")
