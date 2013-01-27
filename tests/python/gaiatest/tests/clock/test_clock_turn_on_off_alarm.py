# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.tests.clock import clock_object
import time


class TestClockTurnOnOffAlarm(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

        # unlock the lockscreen if it's locked
        self.lockscreen.unlock()

        # launch the Clock app
        self.app = self.apps.launch('Clock')

        # create a new alarm for test
        clock_object.create_alarm(self)

    def test_clock_turn_on_off_alarm(self):
        """ Turn on/off the alarm

        https://moztrap.mozilla.org/manage/case/1779/

        """
        self.wait_for_element_displayed(*clock_object._alarm_create_new_locator)

        # turn on the alarm
        origin_alarm_checked = self.marionette.find_element(*clock_object._alarm_checked_status).get_attribute('checked')
        alarm_checked_status = self.marionette.find_element(*clock_object._alarm_checked_status_button)
        self.marionette.tap(alarm_checked_status)
        time.sleep(2)
        new_alarm_checked = self.marionette.find_element(*clock_object._alarm_checked_status).get_attribute('checked')
        self.assertTrue(origin_alarm_checked != new_alarm_checked, 'user should be able to turn on the alarm.')

        # turn off the alarm
        origin_alarm_checked = self.marionette.find_element(*clock_object._alarm_checked_status).get_attribute('checked')
        alarm_checked_status = self.marionette.find_element(*clock_object._alarm_checked_status_button)
        self.marionette.tap(alarm_checked_status)
        time.sleep(2)
        new_alarm_checked = self.marionette.find_element(*clock_object._alarm_checked_status).get_attribute('checked')
        self.assertTrue(origin_alarm_checked != new_alarm_checked, 'user should be able to turn off the alarm.')

    def tearDown(self):
        # delete the new alarm
        clock_object.delete_alarm(self)

        GaiaTestCase.tearDown(self)
