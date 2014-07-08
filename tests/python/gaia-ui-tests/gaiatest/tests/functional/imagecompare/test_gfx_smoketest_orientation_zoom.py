# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.gallery.app import Gallery
from marionette.marionette import Actions
from gaiatest.apps.browser.app import Browser
from gaiatest.utils.Imagecompare.imagecompare_util import ImageCompareUtil
import sys,time
from marionette import By, Wait
import pdb


class TestGfxSmokeTestOZ(GaiaTestCase):

    images = 'IMG_0001.jpg'
    image_count = 4
    _current_image_locator = (By.CSS_SELECTOR, '#frames > div.frame[style ~= "translateX(0px);"]')

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.data_layer.connect_to_wifi()
        # Add photos to storage.
        self.push_resource(self.images, count=self.image_count)

        current_module = str(sys.modules[__name__])
        self.module_name = current_module[current_module.find("'")+1:current_module.find("' from")]
        self.graphics = ImageCompareUtil(self.marionette,self.apps, self,'.')


    def test_gfx_smoke_test_oz(self):

        # flick image, change orientation, pinch zoom, change orientation
        # launch gallery, load image.
        gallery = Gallery(self.marionette)
        gallery.launch()
        gallery.wait_for_files_to_load(self.image_count)

        self.assertEqual(gallery.gallery_items_number, self.image_count)

        # Tap first image to open full screen view.
        image = gallery.tap_first_gallery_item()
        self.assertIsNotNone(image.current_image_source)
        self.assertTrue(image.is_photo_toolbar_displayed)

        #scroll back and forth in different display mode
        self.change_orientation('landscape-primary')
        self.graphics.invoke_screen_capture()
        self.graphics.scroll(self.marionette,self._current_image_locator,'left',5)
        self.change_orientation('portrait-primary')
        self.graphics.invoke_screen_capture()
        self.graphics.scroll(self.marionette,self._current_image_locator,'right',5)

        #flip A LOT
        x = 0
        while ( x < 10):
            self.change_orientation('landscape-primary')
            time.sleep(1)
            self.change_orientation('portrait-primary')
            time.sleep(1)
            x += 1
        self.graphics.invoke_screen_capture()

        # do pinch zoom while filpping the phone
        self.graphics.pinch(self.marionette,self._current_image_locator,'in','high')
        self.graphics.invoke_screen_capture()
        self.graphics.scroll(self.marionette,self._current_image_locator,'left',1,distance=10)
        self.graphics.invoke_screen_capture()
        self.change_orientation('landscape-primary')
        self.graphics.pinch(self.marionette,self._current_image_locator,'out','high')
        self.graphics.invoke_screen_capture()
        self.change_orientation('portrait-primary')
        action = Actions(self.marionette)
        time.sleep(2)
        action.double_tap(self.marionette.find_element(*self._current_image_locator)).perform()
        self.graphics.invoke_screen_capture()
        self.graphics.scroll(self.marionette,self._current_image_locator,'right',1,distance=10)
        self.graphics.invoke_screen_capture()

        # go back and forth with flicking
        self.graphics.scroll(self.marionette,self._current_image_locator,'left',10)
        self.graphics.invoke_screen_capture()
        self.graphics.scroll(self.marionette,self._current_image_locator,'right',7)
        self.graphics.invoke_screen_capture()

        # take screenshot halfway while flicking between images
        action.double_tap(self.marionette.find_element(*self._current_image_locator)).perform()
        time.sleep(2)
        self.graphics.scroll(self.marionette,self._current_image_locator,'right',2,release=False)
        self.graphics.invoke_screen_capture()
        self.change_orientation('portrait-primary')
        self.apps.kill(gallery.app)
        self.graphics.invoke_screen_capture()

        # Kill gallery, launch browser.  Go to Mozilla FirefoxOS site
        # Scroll up/down, change orientation, scroll up/down
        browser = Browser(self.marionette)
        browser.launch()

        browser.go_to_url('http://mozilla.org/firefoxos')
        time.sleep(10)
        self.graphics.scroll(self.marionette,browser._main_screen_locator,'up',7)
        self.graphics.invoke_screen_capture()
        self.graphics.scroll(self.marionette,browser._main_screen_locator,'up',1)
        self.graphics.invoke_screen_capture()
        self.change_orientation('landscape-primary')
        self.graphics.scroll(self.marionette,browser._main_screen_locator,'down',4,distance=100)
        self.graphics.invoke_screen_capture()
        self.graphics.scroll(self.marionette,browser._main_screen_locator,'down',4)
        self.graphics.invoke_screen_capture()

    def tearDown(self):

        # In case the assertion fails this will still kill the call
        # An open call creates problems for future tests
        self.graphics.execute_image_job()

        GaiaTestCase.tearDown(self)