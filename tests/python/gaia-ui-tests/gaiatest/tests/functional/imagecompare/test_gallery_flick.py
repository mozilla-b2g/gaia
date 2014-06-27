# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.gallery.app import Gallery
from marionette.marionette import Actions
from gaiatest.utils.Imagecompare.imagecompare_util import ImageCompareUtil
import sys
from marionette.by import By
import pdb


class TestGallery(GaiaTestCase):

    images = 'IMG_0001.jpg'
    image_count = 4
    _current_image_locator = (By.CSS_SELECTOR, '#frames > div.frame[style ~= "translateX(0px);"]')

    def setUp(self):
        GaiaTestCase.setUp(self)
        current_module = str(sys.modules[__name__])
        self.module_name = current_module[current_module.find("'")+1:current_module.find("' from")]
        self.graphics = ImageCompareUtil(self.marionette,self.apps, self,'.')

        # Add photos to storage.
        self.push_resource(self.images, count=self.image_count)

    def test_gallery_full_screen_image_flicks(self):
        """https://moztrap.mozilla.org/manage/case/1326/"""

        gallery = Gallery(self.marionette)
        gallery.launch()
        gallery.wait_for_files_to_load(self.image_count)

        self.assertEqual(gallery.gallery_items_number, self.image_count)

        # Tap first image to open full screen view.
        image = gallery.tap_first_gallery_item()
        self.assertIsNotNone(image.current_image_source)
        self.assertTrue(image.is_photo_toolbar_displayed)

        self.graphics.scroll(self.marionette,self._current_image_locator,'left',2)
        self.graphics.invoke_screen_capture()
        self.graphics.scroll(self.marionette,self._current_image_locator,'left',1)
        self.graphics.invoke_screen_capture()
        pdb.set_trace()
        action = self.graphics.scroll(self.marionette,self._current_image_locator,'right',2,release=False)
        self.graphics.invoke_screen_capture()
        action.release()
        action.perform()
        self.graphics.scroll(self.marionette,self._current_image_locator,'right',1)
        self.graphics.invoke_screen_capture()

