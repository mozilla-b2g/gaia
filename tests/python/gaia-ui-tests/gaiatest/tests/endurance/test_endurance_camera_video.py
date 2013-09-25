# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

# Approximate runtime per 100 iterations: XXX minutes

from gaiatest import GaiaEnduranceTestCase
from gaiatest.apps.camera.app import Camera

import time


class TestEnduranceCameraVideo(GaiaEnduranceTestCase):

    def setUp(self):
        GaiaEnduranceTestCase.setUp(self)

        # Set video record duration
        self.duration = 7
        self.marionette.log("Video capture duration is " + str(self.duration) + " seconds")

        # Turn off geolocation prompt
        self.apps.set_permission('Camera', 'geolocation', 'deny')

    def test_endurance_camera_video(self):
        self.drive(test=self.camera_video, app='camera')

    def camera_video(self):
        # Start camera
        camera_app = Camera(self.marionette)
        camera_app.launch()

        # Swtich to video
        time.sleep(5)
        camera_app.tap_switch_source()

        # Record a video for the specified duration
        camera_app.record_video(self.duration)

        # Sleep a bit and close the app
        time.sleep(5)
        self.close_app()

        # Wait between iterations
        time.sleep(5)
