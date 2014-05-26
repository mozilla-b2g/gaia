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
    current_module = str(sys.modules[__name__])
    module_name = current_module[current_module.find("'")+1:current_module.find("' from")]
    device_path = '//sdcard//screenshots//'

    def setUp(self):

        GaiaTestCase.setUp(self)
        self.connect_to_network()

        #self.data_layer.connect_to_wifi()


    def test_browser_search(self):

        graphics = ImageCompareUtil(self.marionette,'.')
        graphics.invoke_screen_capture(self.marionette.get_active_frame())
        browser = Browser(self.marionette)
        browser.launch()
        time.sleep(5)
        browserframe = self.marionette.get_active_frame()
        graphics.invoke_screen_capture(browserframe)

        search_text = 'Mozilla Web QA'
        browser.go_to_url(search_text)

        browser.switch_to_content()
        self.wait_for_element_displayed(*self._google_search_input_locator)
        time.sleep(5)
        graphics.invoke_screen_capture(browserframe)

        if (self.testvars['collect_ref_images'] == 'true'):
            # collect screenshots and save it as ref images
            graphics.collect_ref_images(self.device_path,'.',self.module_name)
        else:
            # pull the screenshots off the device and compare.
            graphics.collect_and_compare('.',self.device_path , self.module_name, 5)


