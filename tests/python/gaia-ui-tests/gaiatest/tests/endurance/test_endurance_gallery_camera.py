# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

# Approximate runtime per 100 iterations: xxx minutes

import time

from gaiatest import GaiaEnduranceTestCase
from gaiatest.apps.gallery.app import Gallery


class TestEnduranceGalleryCamera(GaiaEnduranceTestCase):

    def setUp(self):
        GaiaEnduranceTestCase.setUp(self)

        # Turn off geolocation prompt
        self.apps.set_permission('Camera', 'geolocation', 'deny')

        # add photo to storage
        self.push_resource('IMG_0001.jpg', destination='DCIM/100MZLLA')        

        self.gallery = Gallery(self.marionette)
        self.gallery.launch()
        self.gallery.wait_for_files_to_load(1)

    def test_endurance_gallery_camera(self):
        self.drive(test=self.gallery_camera, app='gallery')

    def gallery_camera(self):
        # Test requested per bug 851626:
        # 1. open the Gallery app
        # 2. when the UI/Camera button appears, tap it to switch to the camera
        # 3. when the UI/Gallery button appears, tap it to switch back to the gallery
        # 4. repeat steps 2 and 3 until *crash*
        time.sleep(3)

        # From gallery app, switch to camera app
        self.camera = self.gallery.switch_to_camera()
        self.camera.wait_for_camera_ready()
        time.sleep(3)

        # From camera app, switch back to gallery again
        self.gallery = self.camera.tap_switch_to_gallery()
        self.gallery.wait_for_files_to_load(1)
        self.assertTrue(self.gallery.are_gallery_items_displayed)
