# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import Wait

from gaiatest.apps.settings.app import Settings
from gaiatest import GaiaTestCase
from gaiatest.apps.lockscreen.app import LockScreen


class TestLockScreen(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.connect_to_local_area_network()

    def test_lockscreen_time_check(self):
        """
        https: // bugzilla.mozilla.org / show_bug.cgi?id = 1118054
        Due to the Bug 1133803, test requires active sim with data connection
        """

        self.settings = Settings(self.marionette)
        self.settings.launch()
        datetime_setting = self.settings.open_date_and_time_settings()
        old_time = datetime_setting.get_current_time_datetime

        # Auto time update is by default set to true, turn it off to make region change
        datetime_setting.toggle_automatic_time_update()
        self.assertFalse(datetime_setting.is_autotime_enabled, 'Autotime still enabled')

        # change the region.  since no one will be in Atlantic Ocean timezone, change in time
        # will be guaranteed.
        datetime_setting.set_region('Atlantic Ocean')

        # get the displayed time after the region change
        new_time = datetime_setting.get_current_time_datetime
        self.assertNotEqual(new_time, old_time)

        # lock screen and check time on the lockscreen
        self.marionette.switch_to_frame()
        self.device.lock()
        lock_screen = LockScreen(self.marionette)
        difference = lock_screen.time_in_datetime - new_time
        self.assertLessEqual(difference.seconds, 60)

        # configure to set the time automatically (this will revert the timezone change), then lock screen
        lock_screen.switch_to_frame()
        lock_screen.unlock()
        self.apps.switch_to_displayed_app()

        # Enable the auto time update, so the regions change back and date/time is reverted back
        datetime_setting.toggle_automatic_time_update()
        self.assertTrue(datetime_setting.is_autotime_enabled, 'Autotime still disabled')
        self.marionette.switch_to_frame()
        self.device.lock()

        # wait until device is off and turn back on to check that the time is changed
        Wait(self.marionette, timeout=20).until(
            lambda m: not self.device.is_screen_enabled)
        self.device.turn_screen_on()
        self.marionette.switch_to_frame()

        # Check it reverted to the correct time, and compare it with the previously shown time
        # Allow 4 minutes difference max
        difference = lock_screen.time_in_datetime - old_time

        self.assertLessEqual(difference.seconds, 240)
