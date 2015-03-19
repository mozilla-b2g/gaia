# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

# Approximate runtime per 100 iterations: xx minutes

from gaiatest import GaiaEnduranceTestCase
from gaiatest.apps.videoplayer.app import VideoPlayer
from marionette.wait import Wait

import datetime
import time


class TestEnduranceVideoPlayback(GaiaEnduranceTestCase):

    def setUp(self):
        GaiaEnduranceTestCase.setUp(self)

        # add video to storage
        self.push_resource('VID_0001.3gp')

    def test_endurance_video_playback(self):
        self.drive(test=self.video_playback, app='video')

    def video_playback(self):
        # Playback existing video, some code taken from test_video_player.py

        video_player = VideoPlayer(self.marionette)
        video_player.launch()
        video_player.wait_for_thumbnails_to_load(1, 'Video files found on device: %s' %self.data_layer.video_files)

        # Click on the first video.
        fullscreen_video = video_player.tap_first_video_item()

        # Verify video is playing (controls will flash on)

        # Video will play automatically
        # We'll wait for the controls to clear so we're 'safe' to proceed
        time.sleep(2)

        # We cannot tap the toolbar so let's just enable it with javascript
        fullscreen_video.show_controls()

        # The elapsed time > 0:00 denote the video is playing
        zero_time = time.strptime('00:00', '%M:%S')
        self.assertGreater(fullscreen_video.elapsed_time, zero_time)

        # Wait for video to finish
        time.sleep(15)

        # Verify video is not playing
        # The elapsed time == 0:00 denote the video is not playing
        zero_time = time.strptime('00:00', '%M:%S')
        self.assertEqual(fullscreen_video.elapsed_time, zero_time)

        # Close the app via home screen
        self.close_app(video_player.name)

        # Wait a couple of seconds before repeating
        time.sleep(5)
