# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

# Approximate runtime per 100 iterations: 102 minutes

from gaiatest import GaiaEnduranceTestCase
from gaiatest.apps.camera.app import Camera

import time


class TestEnduranceCameraViewfinder(GaiaEnduranceTestCase):

    def setUp(self):
        GaiaEnduranceTestCase.setUp(self)

        # Turn off geolocation prompt
        self.apps.set_permission('Camera', 'geolocation', 'deny')

    def test_endurance_camera_viewfinder(self):
        self.drive(test=self.camera_viewfinder, app='camera')

    def camera_viewfinder(self):
        # Start camera
        camera_app = Camera(self.marionette)
        camera_app.launch()

        # Leave viewfinder running / displayed for 30 seconds
        time.sleep(30)

        # Sleep a bit then close the app
        self.close_app()

        # Sleep between iterations
        time.sleep(5)
