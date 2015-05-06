# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time

from marionette_driver import Wait

from gaiatest.gaia_graphics_test import GaiaImageCompareTestCase
from gaiatest.apps.videoplayer.app import VideoPlayer


class TestPlay3GPVideo(GaiaImageCompareTestCase):

    _video_length = 13 # in seconds

    def setUp(self):
        GaiaImageCompareTestCase.setUp(self)

        # add video to storage
        self.push_resource('VID_IC_0001.3gp')

    def test_play_3gp_video(self):
        """https://moztrap.mozilla.org/manage/case/2478/"""

        video_player = VideoPlayer(self.marionette)
        video_player.launch()
        video_player.wait_for_thumbnails_to_load(1)

        # Assert that there is at least one video available
        self.assertGreater(video_player.total_video_count, 0)
        first_video_name = video_player.first_video_name
        self.take_screenshot()

        # Click on the first video.
        fullscreen_video = video_player.tap_first_video_item()

        # Video will play automatically
        # After playback, it rewinds to the beginning.  The video file is 13 seconds long
        time.sleep(self._video_length + 3) # add 3 seconds to compensate for the lag

        begin_time = time.strptime('00:00', '%M:%S')
        # display the data overlay to show the elapsed time
        fullscreen_video.show_controls()
        self.assertEqual(fullscreen_video.elapsed_time, begin_time)
        self.assertEqual(first_video_name, fullscreen_video.name)
        self.take_screenshot()

        # take snapshot of random frames
        fullscreen_video.tap_forward()  # tapping forward or rewinds moves frames in 10 sec increment
        self.take_screenshot()
        fullscreen_video.tap_forward()  # go to the end of the frame
        self.take_screenshot()

        # go back to the beginning by tapping rewind twice, since each tap is in 10 second increment
        fullscreen_video.tap_rewind()
        # wait until the elapsed_time goes 10 seconds back
        Wait(self.marionette).until(lambda m: fullscreen_video.elapsed_time == time.strptime('00:03', '%M:%S'))
        fullscreen_video.tap_rewind()
        # wait until the counter goes back to the beginning
        Wait(self.marionette).until(lambda m: fullscreen_video.elapsed_time == begin_time)

        # seek forward
        fullscreen_video.move_seek_slider(100)
        self.take_screenshot()

        # seek backward
        fullscreen_video.move_seek_slider(-50)
        self.take_screenshot()

