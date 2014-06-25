# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from marionette.marionette import Actions
from marionette.marionette import MultiActions
from gaiatest.utils.Imagecompare.imagecompare_util import ImageCompareUtil
import sys,time
import pdb
from marionette.by import By
from gaiatest.apps.browser.app import Browser

class TestUIActions(GaiaTestCase):

    _main_screen_locator = (By.ID, 'main-screen')

    def setUp(self):
        GaiaTestCase.setUp(self)
        current_module = str(sys.modules[__name__])
        self.module_name = current_module[current_module.find("'")+1:current_module.find("' from")]
        self.graphics = ImageCompareUtil(self.marionette,self.apps, self,'.')

        self.data_layer.connect_to_wifi()

    def test_UI_Actions(self):
        browser = Browser(self.marionette)
        browser.launch()

        browser.go_to_url('http://mozilla.org/firefoxos')
        time.sleep(10)
        self.graphics.scroll(self.marionette,browser._main_screen_locator,'down','fast')
        self.graphics.invoke_screen_capture()
        self.graphics.scroll(self.marionette,browser._main_screen_locator,'up','slow')
        self.graphics.invoke_screen_capture()

    def tearDown(self):

        # In case the assertion fails this will still kill the call
        # An open call creates problems for future tests
        self.graphics.execute_image_job()

        GaiaTestCase.tearDown(self)

