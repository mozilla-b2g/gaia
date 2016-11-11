# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time
from gaiatest import GaiaTestCase
from gaiatest.apps.videoplayer.app import VideoPlayer


class TestPlayOGGVideo(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

        # add video to storage
        self.push_resource('VID_counter.ogg')

    def test_play_ogg_video(self):
        """https://moztrap.mozilla.org/manage/case/2478/"""

        video_player = VideoPlayer(self.marionette)
        video_player.launch()
        video_player.wait_for_thumbnails_to_load(1)

        # Assert that there is at least one video available
        self.assertGreater(video_player.total_video_count, 0)

        first_video_name = video_player.first_video_name

        self.assertEqual('none', self.data_layer.current_audio_channel)
        self.apps.switch_to_displayed_app()

        # Click on the first video.
        fullscreen_video = video_player.tap_first_video_item()

        # Video will play automatically
        # We'll wait for the controls to clear so we're 'safe' to proceed
        time.sleep(2)
        self.assertFalse(fullscreen_video.is_video_controls_visible)

        # We cannot tap the toolbar so let's just enable it with javascript
        fullscreen_video.show_controls()

        self.assertTrue(fullscreen_video.is_video_controls_visible)

        # The elapsed time > 0:00 denote the video is playing
        zero_time = time.strptime('00:00', '%M:%S')
        self.assertGreater(fullscreen_video.elapsed_time, zero_time)

        # Check the name too. This will only work if the toolbar is visible.
        self.assertEqual(first_video_name, fullscreen_video.name)

        self.assertEqual('content', self.data_layer.current_audio_channel)
