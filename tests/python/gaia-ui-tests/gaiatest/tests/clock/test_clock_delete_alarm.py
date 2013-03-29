# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
from gaiatest import GaiaTestCase
from gaiatest.tests.clock import clock_object
import time


class TestClockDeleteAlarm(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

        # unlock the lockscreen if it's locked
        self.lockscreen.unlock()

        # launch the Clock app
        self.app = self.apps.launch('Clock')

        # create a new alarm for test
        clock_object.create_alarm(self)

    def test_clock_delete_alarm(self):
        """ Delete alarm

        https://moztrap.mozilla.org/manage/case/1783/

        """
        self.wait_for_element_displayed(*clock_object._alarm_create_new_locator)

        # find the origin alarms' number
        initial_alarms_count = len(self.marionette.find_elements(*clock_object._all_alarms))

        # edit alarm
        alarm_item = self.marionette.find_element(*clock_object._alarm_item)
        self.marionette.tap(alarm_item)

        # delete alarm
        self.wait_for_element_displayed(*clock_object._alarm_delete_button)
        alarm_delete = self.marionette.find_element(*clock_object._alarm_delete_button)
        self.marionette.tap(alarm_delete)

        # wait alarm item not displayed
        self.wait_for_element_displayed(*clock_object._alarm_create_new_locator)
        self.wait_for_condition(lambda m: len(m.find_elements(*clock_object._all_alarms)) != initial_alarms_count)

        # find the new alarms' number
        new_alarms_count = len(self.marionette.find_elements(*clock_object._all_alarms))

        self.assertEqual(initial_alarms_count, new_alarms_count + 1, "delete alarm failed.")
