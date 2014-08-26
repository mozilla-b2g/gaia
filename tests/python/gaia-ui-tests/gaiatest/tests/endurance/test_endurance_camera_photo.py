# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

# Approximate runtime per 100 iterations: xxx minutes

from gaiatest import GaiaEnduranceTestCase
from gaiatest.apps.camera.app import Camera

import time


class TestEnduranceCameraPhoto(GaiaEnduranceTestCase):

    def setUp(self):
        GaiaEnduranceTestCase.setUp(self)

    def test_endurance_camera_photo(self):
        self.drive(test=self.camera_photo, app='camera')

    def camera_photo(self):
        # Start camera
        camera_app = Camera(self.marionette)
        camera_app.launch()
        time.sleep(5)

        # Take a photo
        camera_app.take_photo()

        # Sleep a bit then close the app
        time.sleep(5)
        self.close_app()

        # Sleep between iterations
        time.sleep(5)
