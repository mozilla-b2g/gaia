# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time

from marionette_driver import By
from marionette_driver.marionette import Actions

from gaiatest.apps.gallery.app import Gallery
from gaiatest.gaia_graphics_test import GaiaImageCompareTestCase


class GalleryEditPhotoBase(GaiaImageCompareTestCase):
    _edit_exposure_button_locator = (By.ID, 'edit-exposure-button')
    _edit_effect_button_locator = (By.ID, 'edit-effect-button')
    _edit_crop_button = (By.ID, 'edit-crop-button')
    _crop_aspect_landscape_button = (By.ID, 'edit-crop-aspect-landscape')
    _crop_aspect_portrait_button = (By.ID, 'edit-crop-aspect-portrait')
    _crop_aspect_square_button = (By.ID, 'edit-crop-aspect-square')
    _bw_effect_button = (By.ID, 'edit-effect-bw')
    _sepia_effect_button = (By.ID, 'edit-effect-sepia')
    _blue_steel_effect_button = (By.ID, 'edit-effect-bluesteel')
    _faded_effect_button = (By.ID, 'edit-effect-faded')

    _effect_options_locator = (By.CSS_SELECTOR, '#edit-effect-options a')
    _edit_save_locator = (By.ID, 'edit-save-button')
    _exposure_slider_bar = (By.ID, 'sliderthumb')

    def setUp(self):
        GaiaImageCompareTestCase.setUp(self)

    def gallery_edit_photo(self, photo_file, location=None):

        # add photo to storage
        self.push_resource(photo_file, location)
        gallery = Gallery(self.marionette)
        gallery.launch()
        gallery.wait_for_files_to_load(1)
        self.assertTrue(gallery.gallery_items_number == 1)

        # open picture and capture
        image = gallery.tap_first_gallery_item()
        self.take_screenshot()

        # Tap on Edit button.
        edit_image = image.tap_edit_button()

        self.marionette.find_element(*self._edit_exposure_button_locator).tap()

        # change brightness and capture
        self.move_slider(self._exposure_slider_bar, 250)
        self.take_screenshot()

        edit_image.tap_edit_tool_apply_button()

        # do crop and capture
        self.change_orientation('landscape-primary')
        self.marionette.find_element(*self._edit_crop_button).tap()
        self.take_screenshot()
        self.change_orientation('portrait-primary')
        self.wait_for_element_displayed(*self._crop_aspect_square_button)
        self.marionette.find_element(*self._crop_aspect_portrait_button).tap()
        self.take_screenshot()
        self.change_orientation('landscape-primary')
        self.marionette.find_element(*self._crop_aspect_landscape_button).tap()
        self.take_screenshot()
        self.change_orientation('portrait-primary')
        self.marionette.find_element(*self._crop_aspect_square_button).tap()
        self.take_screenshot()
        self.change_orientation('landscape-primary', 4)
        edit_image.tap_edit_tool_apply_button()

        # Tap on Effects button.
        edit_image.tap_edit_effects_button()
        # Change effects.  take screenshot on each change.
        self.marionette.find_element(*self._bw_effect_button).tap()
        self.take_screenshot()
        self.change_orientation('portrait-primary')
        self.marionette.find_element(*self._sepia_effect_button).tap()
        self.take_screenshot()
        self.change_orientation('landscape-primary')
        self.marionette.find_element(*self._faded_effect_button).tap()
        self.take_screenshot()
        self.change_orientation('portrait-primary')
        self.marionette.find_element(*self._blue_steel_effect_button).tap()
        self.take_screenshot()
        self.change_orientation('landscape-primary')
        edit_image.tap_edit_tool_apply_button()

        # save the resulting picture
        filelist = edit_image.tap_edit_save_button()
        filelist.wait_for_files_to_load(2)
        time.sleep(3)
        self.take_screenshot()
        self.apps.kill(gallery.app)

    # take screenshot and pause, otherwise there will be a collision
    def change_orientation(self, orientation, wait=2):
        self.device.change_orientation(orientation)
        time.sleep(wait)

    # move the slider
    def move_slider(self, slider, dir_x):
        scale = self.marionette.find_element(*slider)
        finger = Actions(self.marionette)
        finger.press(scale)
        finger.move_by_offset(dir_x, 0)
        finger.release()
        finger.perform()
        time.sleep(2)
