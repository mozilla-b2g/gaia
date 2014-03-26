# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.camera.app import Camera


class TestCamera(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

        # Turn off geolocation prompt
        self.apps.set_permission('Camera', 'geolocation', 'deny')

    def test_capture_a_video(self):
        """https://moztrap.mozilla.org/manage/case/2477/"""

        # Check that 0 video files are present before we start the test
        self.assertEqual(len(self.data_layer.video_files), 0)

        self.camera = Camera(self.marionette)
        self.camera.launch()

        # Switch to video mode
        self.camera.tap_switch_source()

        # Record 3 seconds of video
        self.camera.record_video(3)

        # Check that Filmstrip is visible
        self.assertTrue(self.camera.is_filmstrip_visible)
        self.camera.wait_for_filmstrip_not_visible()

        # Check that video saved to SD card
        self.assertIn("VID_0001.3gp", self.data_layer.video_files[0])
