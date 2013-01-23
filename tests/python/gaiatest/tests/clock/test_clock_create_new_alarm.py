# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.tests.clock import clock_object
import time


class TestClockCreateNewAlarm(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

        # unlock the lockscreen if it's locked
        self.lockscreen.unlock()

        # launch the Clock app
        self.app = self.apps.launch('Clock')

    def test_clock_create_new_alarm(self):
        """ Add an alarm

        https://moztrap.mozilla.org/manage/case/1772/

        """
        self.wait_for_element_displayed(*clock_object._alarm_create_new_locator)

        # Get the number of alarms set, before adding the new alarm
        initial_alarms_count = len(self.marionette.find_elements(*clock_object._all_alarms))

        # create a new alarm with the default values that are available
        alarm_create_new = self.marionette.find_element(*clock_object._alarm_create_new_locator)
        self.marionette.tap(alarm_create_new)

        self.wait_for_element_displayed(*clock_object._alarm_save_locator)
        alarm_save = self.marionette.find_element(*clock_object._alarm_save_locator)
        self.marionette.tap(alarm_save)

        # verify the banner-countdown message appears
        self.wait_for_element_displayed(*clock_object._banner_countdown_notification_locator)
        alarm_msg = self.marionette.find_element(*clock_object._banner_countdown_notification_locator).text
        self.assertTrue('The alarm is set for' in alarm_msg, 'Actual banner message was: "' + alarm_msg + '"')

        # Get the number of alarms set after the new alarm was added
        new_alarms_count = len(self.marionette.find_elements(*clock_object._all_alarms))

        # Ensure the new alarm has been added and is displayed
        self.assertTrue(initial_alarms_count < new_alarms_count,
                        'Alarms count did not increment')

    def test_clock_set_alarm_label(self):
        """ Set label of the new alarm

        https://moztrap.mozilla.org/manage/case/1775/

        """
        self.wait_for_element_displayed(*clock_object._alarm_create_new_locator)

        # create a new alarm
        alarm_create_new = self.marionette.find_element(*clock_object._alarm_create_new_locator)
        self.marionette.tap(alarm_create_new)

        # Hack job on this, track Bug 830197
        time.sleep(1)

        # set label
        alarm_label = self.marionette.find_element(*clock_object._new_alarm_label)
        alarm_label.send_keys("\b\b\b\b\btest4321")

        # save the alarm
        alarm_save = self.marionette.find_element(*clock_object._alarm_save_locator)
        self.marionette.tap(alarm_save)

        # verify the label of alarm
        self.wait_for_element_displayed(*clock_object._alarm_label)
        alarm_label = self.marionette.find_element(*clock_object._alarm_label).text
        self.assertTrue("test4321" == alarm_label, 'Actual label was: "' + alarm_label + '", not "test4321".')

    def tearDown(self):
        # delete the new alarm
        clock_object.delete_alarm(self)

        GaiaTestCase.tearDown(self)
