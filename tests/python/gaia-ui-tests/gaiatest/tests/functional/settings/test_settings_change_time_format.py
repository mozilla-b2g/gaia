# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.settings.app import Settings
from gaiatest.apps.system.app import System
from gaiatest.apps.lockscreen.app import LockScreen


class TestSettingsChangeTimeFormat(GaiaTestCase):
    def setUp(self):
        GaiaTestCase.setUp(self)

        # Set the time on the device
        _seconds_since_epoch = self.marionette.execute_script("""
                    var today = new Date();
                    var yr = today.getFullYear();
                    var mth = today.getMonth();
                    var day = today.getDate();
                    return new Date(yr, mth, day, 22, 0, 0).getTime();""")
        self.data_layer.set_time(_seconds_since_epoch)

    def test_settings_change_time_format(self):
        """
        https://moztrap.mozilla.org/manage/case/14358/
        """
        status_bar = System(self.marionette).status_bar

        self.assertEqual('10:00', status_bar.maximized.time)

        settings = Settings(self.marionette)
        settings.launch()

        date_and_time = settings.open_date_and_time()

        date_and_time.select_time_format('24-hour')

        self.marionette.switch_to_frame()
        self.assertEqual('22:00', status_bar.minimized.time)

        self.device.lock()

        lock_screen = LockScreen(self.marionette)
        lock_screen.switch_to_frame()

        self.assertEqual('22:00', lock_screen.time)
