# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.tests.clock import clock_object
import time


class TestClockSwitchClockType(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

        # unlock the lockscreen if it's locked
        self.lockscreen.unlock()

        # launch the Clock app
        self.app = self.apps.launch('Clock')

    def test_clock_switch_clock_type(self):
        """ Switch the clock type

        https://moztrap.mozilla.org/manage/case/1770

        """
        self.wait_for_element_displayed(*clock_object._alarm_create_new_locator)

        # switch to digital clock
        analog_display = self.marionette.find_element(*clock_object._analog_clock_display)
        self.marionette.tap(analog_display)
        self.wait_for_element_displayed(*clock_object._digital_clock_display)
        self.assertTrue(self.marionette.find_element(*clock_object._digital_clock_display).is_displayed(), "The digital clock should be displayed.")

        # switch to analog clock
        digital_display = self.marionette.find_element(*clock_object._digital_clock_display)
        self.marionette.tap(digital_display)
        self.wait_for_element_displayed(*clock_object._analog_clock_display)
        self.assertTrue(self.marionette.find_element(*clock_object._analog_clock_display).is_displayed(), "The analog clock should be displayed.")

    def test_clock_show_time_date(self):
        """ Show the time, date

        https://moztrap.mozilla.org/manage/case/1771

        """
        self.wait_for_element_displayed(*clock_object._alarm_create_new_locator)

        # check the date, time, state for digital clock
        analog_display = self.marionette.find_element(*clock_object._analog_clock_display)
        self.marionette.tap(analog_display)
        self.wait_for_element_displayed(*clock_object._digital_clock_display)
        self.assertTrue(self.marionette.find_element(*clock_object._clock_day_date).is_displayed(), "The date of digital clock should be displayed.")
        self.assertTrue(self.marionette.find_element(*clock_object._digital_clock_display).is_displayed(), "The time of digital clock should be displayed.")
        self.assertTrue(self.marionette.find_element(*clock_object._digital_clock_hour24_state).is_displayed(), "The hour24-state of digital clock should be displayed.")

        # check the date, time for analog clock
        digital_display = self.marionette.find_element(*clock_object._digital_clock_display)
        self.marionette.tap(digital_display)
        self.wait_for_element_displayed(*clock_object._analog_clock_display)
        self.assertTrue(self.marionette.find_element(*clock_object._clock_day_date).is_displayed(), "The date should be displayed.")
        self.assertTrue(self.marionette.find_element(*clock_object._analog_clock_display).is_displayed(), "The date should be displayed.")
