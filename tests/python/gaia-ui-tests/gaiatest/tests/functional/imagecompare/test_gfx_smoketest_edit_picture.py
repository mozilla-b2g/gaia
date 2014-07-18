# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest import GaiaTestCase
from gaiatest.apps.gallery.app import Gallery
from marionette.marionette import Actions
from gaiatest.utils.Imagecompare.imagecompare_util import ImageCompareUtil
import sys
import pdb

class TestGalleryEditPhoto(GaiaTestCase):

    _edit_effect_button_locator = (By.ID, 'edit-effect-button')
    _edit_crop_button = (By.ID, 'edit-crop-button')
    _crop_aspect_landscape_button = (By.ID, 'edit-crop-aspect-landscape')
    _crop_aspect_portrait_button = (By.ID, 'edit-crop-aspect-portrait')
    _crop_aspect_square_button = (By.ID, 'edit-crop-aspect-square')
    _bw_effect_button = (By.ID, 'edit-effect-bw')
    _sepia_effect_button = (By.ID, 'edit-effect-sepia')
    _bluesteel_effect_button = (By.ID, 'edit-effect-bluesteel')
    _faded_effect_button = (By.ID, 'edit-effect-faded')

    _effect_options_locator = (By.CSS_SELECTOR, '#edit-effect-options a')
    _edit_save_locator = (By.ID, 'edit-save-button')
    _exposure_slider_bar = (By.ID, 'sliderthumb')

    def setUp(self):
        GaiaTestCase.setUp(self)

        # add photo to storage
        self.push_resource('IMG_0001.jpg')
        current_module = str(sys.modules[__name__])
        self.module_name = current_module[current_module.find("'")+1:current_module.find("' from")]
        self.graphics = ImageCompareUtil(self.marionette,self.apps, self,'.')

    def test_gallery_edit_photo(self):
        gallery = Gallery(self.marionette)
        gallery.launch()
        gallery.wait_for_files_to_load(1)

        self.assertTrue(gallery.gallery_items_number > 0)

        # open picture and capture
        image = gallery.tap_first_gallery_item()
        self.graphics.invoke_screen_capture()

        # Tap on Edit button.
        edit_image = image.tap_edit_button()

        # change brightness and capture
        self.move_slider(self._exposure_slider_bar,250)
        self.graphics.invoke_screen_capture()

        #do crop and capture
        self.device.change_orientation('landscape-primary')
        self.marionette.find_element(*self._edit_crop_button).tap()
        self.graphics.invoke_screen_capture()
        self.device.change_orientation('portrait-primary')
        self.wait_for_element_displayed(*self._crop_aspect_square_button)
        self.marionette.find_element(*self._crop_aspect_portrait_button).tap()
        self.graphics.invoke_screen_capture()
        self.device.change_orientation('landscape-primary')
        self.marionette.find_element(*self._crop_aspect_landscape_button).tap()
        self.graphics.invoke_screen_capture()
        self.device.change_orientation('portrait-primary')
        self.marionette.find_element(*self._crop_aspect_square_button).tap()
        self.graphics.invoke_screen_capture()
        self.device.change_orientation('landscape-primary')

        # Tap on Effects button.
        edit_image.tap_edit_effects_button()
        # Change effects.  take screenshot on each change.
        self.marionette.find_element(*self._bw_effect_button).tap()
        self.graphics.invoke_screen_capture()
        self.device.change_orientation('portrait-primary')
        self.marionette.find_element(*self._sepia_effect_button).tap()
        self.graphics.invoke_screen_capture()
        self.device.change_orientation('landscape-primary')
        self.marionette.find_element(*self._faded_effect_button).tap()
        self.graphics.invoke_screen_capture()
        self.device.change_orientation('portrait-primary')
        self.marionette.find_element(*self._bluesteel_effect_button).tap()
        self.graphics.invoke_screen_capture()
        self.device.change_orientation('landscape-primary')

        # save the resulting picture
        gallery = edit_image.tap_edit_save_button()
        gallery.wait_for_files_to_load(12)
        self.graphics.invoke_screen_capture()

        # Verify new Photo is created by opening the first image (most recent) in the list
        self.assertEqual(13, gallery.gallery_items_number)

    # move the slider
    def move_slider(self, slider, dir_x):
        scale = self.marionette.find_element(*slider)
        finger = Actions(self.marionette)
        finger.press(scale)
        finger.move_by_offset(dir_x,0)
        finger.release()
        finger.perform()

    def tearDown(self):

        # In case the assertion fails this will still kill the call
        # An open call creates problems for future tests
        self.graphics.execute_image_job()

        GaiaTestCase.tearDown(self)