# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.lockscreen.app import LockScreen


class TestLockScreen(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

        # this time we need it locked!
        self.lockscreen.lock()
        self.lock_screen = LockScreen(self.marionette)

    def test_unlock_to_homescreen(self):
        # https://moztrap.mozilla.org/manage/case/1296/
        homescreen = self.lock_screen.unlock()
        self.lock_screen.wait_for_lockscreen_not_visible()

        homescreen.switch_to_homescreen_frame()
        homescreen.wait_for_landing_page_visible()
