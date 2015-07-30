# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time

from gaiatest import GaiaTestCase
from gaiatest.apps.camera.app import Camera
from gaiatest.apps.camera.app import ImagePreview

from marionette_driver import Wait


class TestPreviewDelete(GaiaTestCase):
    def setUp(self):
        GaiaTestCase.setUp(self)

        # Turn off geolocation prompt
        self.apps.set_permission('Camera', 'geolocation', 'deny')

    def test_capture_and_delete_video(self):
        """
        https://moztrap.mozilla.org/manage/case/3324/
        """
        self.previous_number_of_videos = len(self.data_layer.video_files)

        # launch camera app
        self.camera = Camera(self.marionette)
        self.camera.launch()

        # Switch to video mode
        self.camera.tap_switch_source()

        # Record 10 seconds of video
        self.camera.record_video(10)

        # Check that video saved to SD card
        self.assertEqual(len(self.data_layer.video_files), self.previous_number_of_videos + 1)

        # Tap preview icon to see the video that's just taken
        self.camera.tap_thumbnail()
        self.preview = ImagePreview(self.marionette)
        Wait(self.marionette).until(lambda m: self.preview.is_video_play_button_visible is True)

        # Play video, then pause it
        self.preview.tap_video_player_play_button()
        time.sleep(5)
        self.preview.tap_video_player_pause_button()

        # Tape the options icon, and delete the file
        self.preview.delete_file()

        # Check the user is back in camera preview mode, and there is no preview icon anymore
        Wait(self.marionette).until(lambda m: self.camera.is_thumbnail_visible is False)

        # Verify the video is deleted now
        self.assertEqual(len(self.data_layer.video_files), self.previous_number_of_videos)
