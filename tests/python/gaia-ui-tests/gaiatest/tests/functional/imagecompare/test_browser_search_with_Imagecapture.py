# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
import sys
import time
from marionette.by import By
from gaiatest import GaiaTestCase
from gaiatest.apps.browser.app import Browser
from gaiatest.utils.Imagecompare.imagecompare_util import ImageCompareUtil

class TestBrowserSearch(GaiaTestCase):
    _google_search_input_locator = (By.NAME, 'q')

    #needed for the imagecapture utility.  Also need to import sys



    def setUp(self):

        GaiaTestCase.setUp(self)
        self.connect_to_network()

        current_module = str(sys.modules[__name__])
        self.module_name = current_module[current_module.find("'")+1:current_module.find("' from")]
        self.graphics = ImageCompareUtil(self.marionette,self.apps, '.')
        #self.data_layer.connect_to_wifi()

    def test_browser_search(self):

        self.graphics.invoke_screen_capture()
        browser = Browser(self.marionette)
        browser.launch()
        time.sleep(5)
        self.graphics.invoke_screen_capture()

        search_text = 'Mozilla Web QA'
        browser.go_to_url(search_text)

        browser.switch_to_content()
        self.wait_for_element_displayed(*self._google_search_input_locator)
        time.sleep(5)
        self.graphics.invoke_screen_capture()

    def tearDown(self):

        # In case the assertion fails this will still kill the call
        # An open call creates problems for future tests
        self.graphics.execute_image_job(self)

        GaiaTestCase.tearDown(self)