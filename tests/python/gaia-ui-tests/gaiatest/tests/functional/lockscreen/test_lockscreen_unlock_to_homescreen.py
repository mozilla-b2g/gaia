# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.lockscreen.app import LockScreen


class TestLockScreen(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

        # this time we need it locked!
        self.device.lock()

    def test_unlock_to_homescreen(self):
        """
        https://moztrap.mozilla.org/manage/case/6784/
        """

        lock_screen = LockScreen(self.marionette)
        lock_screen.switch_to_frame()
        homescreen = lock_screen.unlock()

        from gaiatest.apps.homescreen.app import Homescreen
        Homescreen(self.marionette).wait_to_be_displayed()
