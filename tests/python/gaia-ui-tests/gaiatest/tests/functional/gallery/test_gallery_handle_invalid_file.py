# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.gallery.app import Gallery

from marionette import Wait
from marionette.marionette_test import parameterized


class TestGalleryHandleInvalidPhoto(GaiaTestCase):

    # the test files are copied from https://github.com/mozilla-b2g/gaia/tree/master/apps/gallery/test/images by djf
    @parameterized("zero_length_file", 'image_formats/x05.png')
    @parameterized("text_file", 'image_formats/x06.jpg')
    @parameterized("truncated_jpg", 'image_formats/x08.jpg')
    @parameterized("truncated_png", 'image_formats/x09.png')
    @parameterized("truncated_gif", 'image_formats/x10.gif')
    @parameterized("truncated_bmp", 'image_formats/x11.bmp')
    def test_gallery_handle_load_corrupt_file(self, filename):
        self.push_resource(filename)

        gallery = Gallery(self.marionette)
        gallery.launch(True)
        self.assertTrue(len(self.data_layer.picture_files) == 1)

        # image will not display in the gallery app
        Wait(self.marionette).until(lambda m: gallery.empty_gallery_text == 'Use the Camera app to get started.')
        self.assertTrue(gallery.gallery_items_number == 0)
        self.assertEqual(gallery.empty_gallery_title, 'No photos or videos')
