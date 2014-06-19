# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.gallery.app import Gallery
from marionette.marionette import Actions
from gaiatest.utils.Imagecompare.imagecompare_util import ImageCompareUtil
import sys,time
from marionette.by import By

class TestUIActions(GaiaTestCase):

    images = 'IMG_0001.jpg'
    image_count = 4
    _current_image_locator = (By.CSS_SELECTOR, '#frames > div.frame[style ~= "translateX(0px);"]')
    _screen_locator = (By.TAG_NAME, 'body')
    _main_screen_locator = (By.ID, 'main-screen')

    def setUp(self):
        GaiaTestCase.setUp(self)
        current_module = str(sys.modules[__name__])
        self.module_name = current_module[current_module.find("'")+1:current_module.find("' from")]
        self.graphics = ImageCompareUtil(self.marionette,self.apps, '.')

        #self.data_layer.connect_to_wifi()
        # Add photos to storage.
        self.push_resource(self.images, self.image_count, 'DCIM/100MZLLA')

    def test_UI_Actions(self):
        """https://moztrap.mozilla.org/manage/case/2462/"""
        gallery = Gallery(self.marionette)
        gallery.launch()
        gallery.wait_for_files_to_load(self.image_count)

        # Tap first image to open full screen view.
        gallery.tap_first_gallery_item()

        time.sleep(10)
        #pdb.set_trace()
        self.graphics.pinch(self.marionette,self._current_image_locator,'in','high')
        self.graphics.invoke_screen_capture()
        self.graphics.pinch(self.marionette,self._current_image_locator,'out','low')
        self.graphics.invoke_screen_capture()
        screen = self.marionette.find_element(*self._current_image_locator)
        action = Actions(self.marionette)
        action.double_tap(screen).perform()
        self.graphics.invoke_screen_capture()


    def tearDown(self):

        # In case the assertion fails this will still kill the call
        # An open call creates problems for future tests
        self.graphics.execute_image_job(self)

        GaiaTestCase.tearDown(self)


