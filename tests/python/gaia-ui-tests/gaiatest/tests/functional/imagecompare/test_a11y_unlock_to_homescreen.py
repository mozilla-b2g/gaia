# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest import GaiaTestCase
from gaiatest.apps.lockscreen.app import LockScreen
from gaiatest.apps.homescreen.app import Homescreen
from gaiatest.utils.Imagecompare.imagecompare_util import ImageCompareUtil
import sys,time


class TestLockScreenAccessibility(GaiaTestCase):

    #needed for the imagecapture utility

    def setUp(self):
        GaiaTestCase.setUp(self)

        current_module = str(sys.modules[__name__])
        self.module_name = current_module[current_module.find("'")+1:current_module.find("' from")]
        self.graphics = ImageCompareUtil(self.marionette,self.apps, '.')

        self.device.lock()


    def test_a11y_unlock_to_homescreen(self):

        lock_screen = LockScreen(self.marionette)
        lockScreen_window = self.marionette.find_element(*lock_screen._lockscreen_window_locator)
        homescreen_container = self.marionette.find_element(By.ID, 'homescreen')

        self.wait_for_condition(lambda m: not self.accessibility.is_hidden(lockScreen_window))
        self.wait_for_condition(lambda m: self.accessibility.is_hidden(homescreen_container))

        homescreen = lock_screen.a11y_click_unlock_button()
        lock_screen.wait_for_lockscreen_not_visible()
        self.assertEquals(self.apps.displayed_app.name, homescreen.name)

        self.assertTrue(self.accessibility.is_hidden(lockScreen_window))
        self.assertFalse(self.accessibility.is_hidden(homescreen_container))
        time.sleep(5)
        self.graphics.invoke_screen_capture()

    def tearDown(self):

        # In case the assertion fails this will still kill the call
        # An open call creates problems for future tests
        self.graphics.execute_image_job(self)

        GaiaTestCase.tearDown(self)

