# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.utils.Imagecompare.imagecompare_util import ImageCompareUtil
from marionette.marionette import Actions
import sys,time
from marionette.by import By
import pdb

class TestCardsView(GaiaTestCase):

    _test_apps = ['Contacts', 'Clock']
    _screen_locator = (By.ID, 'views')

    def setUp(self):
        GaiaTestCase.setUp(self)
        current_module = str(sys.modules[__name__])
        self.module_name = current_module[current_module.find("'")+1:current_module.find("' from")]
        self.graphics = ImageCompareUtil(self.marionette,self.apps, '.')

        # Launch the test apps
        for app in self._test_apps:
            self.apps.launch(app)

    def test_that_app_can_be_launched_from_cards_view(self):

        displayed_frame = self.apps.displayed_app.frame

        action = self.graphics.edge_scroll(self.marionette,displayed_frame,'LtoR',0.8,False)
        self.graphics.invoke_screen_capture(frame='root')
        action.release()
        action.perform()
        self.graphics.invoke_screen_capture()

        self.wait_for_condition(lambda m: self.apps.displayed_app.name == self._test_apps[0])

    def tearDown(self):
        self.graphics.execute_image_job(self)
        GaiaTestCase.tearDown(self)