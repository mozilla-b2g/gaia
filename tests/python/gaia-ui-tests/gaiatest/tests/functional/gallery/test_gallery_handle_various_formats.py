# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest import GaiaTestCase
from gaiatest.apps.gallery.app import Gallery
from marionette import Wait
from marionette import expected

class TestGalleryHandleInvalidPhoto(GaiaTestCase):
    _fullscreen_back_button_locator = (By.ID, 'fullscreen-back-button-tiny')

    def setUp(self):
        GaiaTestCase.setUp(self)

        # the test files are copied from https://github.com/mozilla-b2g/gaia/tree/master/apps/gallery/test/images
        # below images will display in the gallery app
        self.push_resource('image_formats/01.jpg') # jpeg image
        self.push_resource('image_formats/02.png') #png image
        self.push_resource('image_formats/03.gif') #gif image
        self.push_resource('image_formats/04.bmp') #bmp image
        self.push_resource('image_formats/05.jpg') #progressive jpeg
        self.push_resource('image_formats/06.png') #png with transparent bg
        self.push_resource('image_formats/07.gif') #animated gif
        self.push_resource('image_formats/08.png') #animate png

        # below images will not display in the gallery app
        self.push_resource('image_formats/x05.png')  # a zero length file
        self.push_resource('image_formats/x06.jpg')  # a text file that has an image extension
        self.push_resource('image_formats/x07.jpg')  # a corrupt jped file (a zero byte change.  gecko can't display it)
        self.push_resource('image_formats/x08.jpg')  # truncated jpeg
        self.push_resource('image_formats/x09.png')  # truncated png
        self.push_resource('image_formats/x10.gif')  # truncated gif
        self.push_resource('image_formats/x11.bmp')  # truncated bmp

    def test_gallery_edit_photo(self):
        gallery = Gallery(self.marionette)
        gallery.launch()
        gallery.wait_for_files_to_load(8)  # all and only valid files are showing previews
        self.assertTrue(gallery.gallery_items_number == 8)

        # make sure the file opens, and can go back to the thumbnail view
        gallery.tap_first_gallery_item()
        back_button = self.marionette.find_element(*self._fullscreen_back_button_locator)
        Wait(self.marionette).until(expected.element_displayed(back_button))
        back_button.tap()

        self.assertTrue(gallery.are_gallery_items_displayed)
