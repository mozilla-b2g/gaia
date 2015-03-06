# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.marionette_test import parameterized
from marionette_driver import Wait

from gaiatest import GaiaTestCase
from gaiatest.apps.gallery.app import Gallery


class TestGalleryHandleValidPhoto(GaiaTestCase):

    # the test files are copied from https://github.com/mozilla-b2g/gaia/tree/master/apps/gallery/test/images by djf
    @parameterized("load_jpg", 'image_formats/01.jpg', 800, 1200)
    @parameterized("load_png", 'image_formats/02.png', 800, 1200)
    @parameterized("load_gif", 'image_formats/03.gif', 800, 1200)
    @parameterized("load_bmp", 'image_formats/04.bmp', 200, 300)
    @parameterized("load_progressive_jpg", 'image_formats/05.jpg', 800, 1200)
    @parameterized("load_transparent_background_png", 'image_formats/06.png', 800, 1200)
    @parameterized("animated_gif", 'image_formats/07.gif', 400, 600)
    @parameterized("animated_png", 'image_formats/08.png', 400, 600)
    def test_gallery_open_valid_image_file(self, filename, width, height):

        self.push_resource(filename)

        gallery = Gallery(self.marionette)
        gallery.launch()
        gallery.wait_for_files_to_load(1)  # all and only valid files are showing previews
        self.assertTrue(gallery.gallery_items_number == 1)

        # make sure the file opens
        image = gallery.tap_first_gallery_item()

        # verify the blob is displayed
        self.assertTrue("blob:app://gallery.gaiamobile.org/" in image.current_image_source)

        # collect the initial image view dimension for comparison later
        initial_width = image.current_image_size_width
        initial_height = image.current_image_size_height

        image.double_tap_image()  # displays the image in its original resolution

        # for big images exceeding the phone resolution, the gallery app only doubles the view size
        # from the initial view; it does not render the entire image fully
        if width <= (2 * initial_width) and height <= (2 * initial_height):
            Wait(self.marionette).until(lambda m: image.current_image_size_width == width)
            Wait(self.marionette).until(lambda m: image.current_image_size_height == height)
        else:
            Wait(self.marionette).until(lambda m: image.current_image_size_width == 2 * initial_width)
            Wait(self.marionette).until(lambda m: image.current_image_size_height == 2 * initial_height)
