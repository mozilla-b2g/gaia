# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from marionette.marionette import Actions
from gaiatest.utils.Imagecompare.imagecompare_util import ImageCompareUtil
from gaiatest.apps.homescreen.app import Homescreen
import sys
from marionette import By
import pdb


class testGfxSmokeTestDragDrop(GaiaTestCase):
    _homescreen_locator = (By.CLASS_NAME, 'scrollable')

    def setUp(self):
        GaiaTestCase.setUp(self)

        current_module = str(sys.modules[__name__])
        self.module_name = current_module[current_module.find("'")+1:current_module.find("' from")]
        self.graphics = ImageCompareUtil(self.marionette,self.apps, self,'.')

        self.homescreen = Homescreen(self.marionette)
        self.apps.switch_to_displayed_app()


    def test_gfx_smoke_test_drag_drop(self):

        self.graphics.invoke_screen_capture()
        self.homescreen.wait_for_number_of_apps(1)
        first_app_before_move = self.homescreen.visible_apps[0].name

        # Assert that we are not in edit mode.
        self.assertFalse(self.homescreen.is_edit_mode_active, "Edit mode should not be active")

        # Move first app to position 3 (index 2) and to position 4
        self.homescreen.move_app_to_position(0, 2)
        self.graphics.invoke_screen_capture()
        self.homescreen.move_app_to_position(2, 3)
        self.graphics.invoke_screen_capture()
        self.homescreen.move_app_to_position(5, 4)
        self.graphics.invoke_screen_capture()

        #self.graphics.scroll(self.marionette,self._homescreen_locator,'up',4)
        self.graphics.invoke_screen_capture()

        # Assert that we are in edit mode.
        self.assertTrue(self.homescreen.is_edit_mode_active, "Edit mode should be active")

        # Exit edit mode
        self.device.touch_home_button()
        self.assertFalse(self.homescreen.is_edit_mode_active, "Edit mode should not be active")
        #self.graphics.scroll(self.marionette,self._homescreen_locator,'down',6)
        #self.graphics.invoke_screen_capture()
        #self.graphics.scroll(self.marionette,self._homescreen_locator,'down',6)
        #self.graphics.invoke_screen_capture()

    def tearDown(self):

        # In case the assertion fails this will still kill the call
        # An open call creates problems for future tests
        self.graphics.execute_image_job()

        GaiaTestCase.tearDown(self)