# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.camera.app import Camera
from gaiatest.apps.videoplayer.app import VideoPlayer

import time
from marionette.wait import Wait


class TestCameraRecordingStopsAutomatically(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

        # Turn off geolocation prompt
        self.apps.set_permission('Camera', 'geolocation', 'deny')

    def test_camera_recording_stops_when_tapping_homescreen(self):
        """
        https://moztrap.mozilla.org/manage/case/14447
        """
        VIDEO_RECORDING_DURATION = time.strptime('00:05', '%M:%S')

        camera = Camera(self.marionette)
        camera.launch()

        # Switch to video mode and start recording
        camera.tap_switch_source()
        camera.tap_capture()

        Wait(self.marionette).until(lambda m: VIDEO_RECORDING_DURATION == camera.video_timer)

        # Wait before going to homescree
        self.device.touch_home_button()

        videoplayer = VideoPlayer(self.marionette)
        videoplayer.launch()
        videoplayer.wait_for_thumbnails_to_load(1)

        first_thumbnail_video_duration = videoplayer.thumbnails[0].total_duration_time

        # Check that the recording duration is correct with a 2 seconds margin of error
        self.assertLessEqual(abs(self._total_seconds(first_thumbnail_video_duration) -
                                 self._total_seconds(VIDEO_RECORDING_DURATION)), 2)

        fullscreen_video = videoplayer.tap_first_video_item()

        # Video will play automatically
        # We'll wait for the controls to clear so we're 'safe' to proceed
        time.sleep(2)

        # We cannot tap the toolbar so let's just enable it with javascript
        fullscreen_video.show_controls()
        recording_duration = fullscreen_video.total_duration_time

        # Check that the recording duration is correct with a 2 seconds margin of error
        self.assertLessEqual(abs(self._total_seconds(recording_duration) -
                                 self._total_seconds(VIDEO_RECORDING_DURATION)), 2)

    def _total_seconds(self, time):
        """
        Converts time duration to seconds (no. of seconds elapsed from 00:00:00)
        """
        import datetime
        return datetime.\
            timedelta(minutes=time.tm_min,
                      seconds=time.tm_sec).total_seconds()
