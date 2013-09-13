# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.clock.app import Clock


class TestClockSwitchClockType(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

        self.clock = Clock(self.marionette)
        self.clock.launch()

    def test_clock_switch_clock_type(self):
        """ Switch the clock type
        https://moztrap.mozilla.org/manage/case/1770
        """

        # switch to digital clock
        self.clock.tap_analog_display()
        self.assertTrue(self.clock.is_digital_clock_displayed, "The digital clock should be displayed.")

        # switch to analog clock
        self.clock.tap_digital_display()
        self.assertTrue(self.clock.is_analog_clock_displayed, "The analog clock should be displayed.")

    def test_clock_show_time_date(self):
        """ Show the time, date
        https://moztrap.mozilla.org/manage/case/1771
        """

        # check the date, time, state for digital clock
        self.clock.tap_analog_display()
        self.assertTrue(self.clock.is_day_and_date_displayed, "The date of digital clock should be displayed.")
        self.assertTrue(self.clock.is_digital_clock_displayed, "The time of digital clock should be displayed.")
        self.assertTrue(self.clock.is_24_hour_state_displayed, "The hour24-state of digital clock should be displayed.")

        # check the date, time for analog clock
        self.clock.tap_digital_display()
        self.assertTrue(self.clock.is_day_and_date_displayed, "The date of digital clock should be displayed.")
        self.assertTrue(self.clock.is_analog_clock_displayed, "The time of digital clock should be displayed.")
        self.assertFalse(self.clock.is_24_hour_state_displayed, "The hour24-state of digital clock should be displayed.")
