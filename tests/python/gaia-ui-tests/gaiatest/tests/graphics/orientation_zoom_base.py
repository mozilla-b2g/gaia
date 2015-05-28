# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time

from marionette_driver import By

from gaiatest.gaia_graphics_test import GaiaImageCompareTestCase
from gaiatest.apps.gallery.app import Gallery
from gaiatest.apps.search.app import Search


class OrientationZoomBase(GaiaImageCompareTestCase):

    images = 'IMG_0001.jpg'
    image_count = 4
    _current_image_locator = (By.CSS_SELECTOR, '#frames > div.frame[style ~= "translateX(0px);"]')

    def setUp(self):
        GaiaImageCompareTestCase.setUp(self)
        self.connect_to_local_area_network()

    def orientation_zoom_check(self):

        self.push_resource(self.images, count=self.image_count)

        self.take_screenshot()
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

        # scroll back and forth in different display mode
        self.change_orientation('landscape-primary')
        self.take_screenshot()
        self.scroll(image._current_image_locator, 'right', 400)
        self.change_orientation('portrait-primary')
        self.take_screenshot()
        self.scroll(image._current_image_locator, 'left', 400)

        # flip A LOT
        for x in range(0, 4):
            self.change_orientation('landscape-primary')
            self.change_orientation('portrait-primary')
        self.take_screenshot()

        # do pinch zoom while filpping the phone
        self.pinch(image._current_frame_locator, 'in', 20)
        self.take_screenshot()
        self.scroll(image._current_frame_locator, 'right', 300)
        self.take_screenshot()
        self.change_orientation('landscape-primary')
        self.pinch(image._current_frame_locator, 'out', 50)
        self.take_screenshot()
        self.change_orientation('portrait-primary')

        image.double_tap_image()
        self.take_screenshot()

        # go back and forth with flicking then exit gallery app
        self.scroll(image._current_frame_locator, 'right', 150)
        self.take_screenshot()
        self.scroll(image._current_frame_locator, 'left', 150)
        self.take_screenshot()
        self.apps.kill(gallery.app)
        time.sleep(2)
        self.take_screenshot()

        # Launch browser.  Go to Mozilla FirefoxOS site
        # Scroll up/down, change orientation, scroll up/down
        # commented out due to bug 1127324

        # search = Search(self.marionette)
        # search.launch()
        # browser = search.go_to_url('http://mozilla.org/firefoxos')
        # browser.wait_for_page_to_load()
        # browser.switch_to_content()
        #
        # self.take_screenshot()
        # self.marionette.switch_to_frame()
        # self.scroll(browser._browser_frame_locator, 'up', 400)
        # self.take_screenshot()
        # self.change_orientation('landscape-primary')
        # self.scroll(browser._browser_frame_locator, 'down', 300)
        # self.take_screenshot()
        # self.scroll(browser._browser_frame_locator, 'down', 300)
        # self.take_screenshot()

    # take screenshot and pause, otherwise there will be a collision
    def change_orientation(self, orientation, wait=2):
        self.device.change_orientation(orientation)
        time.sleep(wait)
