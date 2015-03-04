# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.gallery.app import Gallery
from marionette_driver import Wait


class TestGallery(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

        self.apps.set_permission('Camera', 'geolocation', 'deny')

        # add photo to storage
        self.push_resource('IMG_0001.jpg')

    def test_gallery_view(self):
        """
        https://moztrap.mozilla.org/manage/case/2309/
        """

        gallery = Gallery(self.marionette)
        gallery.launch()
        gallery.wait_for_files_to_load(1)

        # From the main list view, click camera icon
        self.previous_number_of_pictures = len(self.data_layer.picture_files)
        camera = gallery.switch_to_camera()

        # Take the shot
        camera.take_photo()

        # Check that picture saved to SD card
        Wait(self.marionette).until(lambda m: len(self.data_layer.picture_files) ==
                                    self.previous_number_of_pictures + 1)

        # Verify the Camera app is still open, by checking for the presence of thumbnail
        self.assertTrue(camera.is_thumbnail_visible)
