# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.lockscreen.app import LockScreen


class TestLockScreen(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

        # Turn off geolocation prompt
        self.apps.set_permission('Camera', 'geolocation', 'deny')

        # this time we need it locked!
        self.lockscreen.lock()
        self.lock_screen = LockScreen(self.marionette)

    def test_unlock_to_camera(self):
        # https://moztrap.mozilla.org/manage/case/1296/
        camera = self.lock_screen.unlock_to_camera()
        self.lock_screen.wait_for_lockscreen_not_visible()

        self.assertFalse(self.lockscreen.is_locked)

        # Wait fot the capture button displayed. no need to take a photo.
        camera.switch_to_camera_frame()
        camera.wait_for_camera_ready()
