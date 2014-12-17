# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.camera.app import Camera
from gaiatest.apps.videoplayer.app import VideoPlayer


class TestCameraRecordingStopsAutomatically(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

        # Turn off geolocation prompt
        self.apps.set_permission('Camera', 'geolocation', 'deny')

    def test_camera_recording_stops_when_tapping_homescreen(self):
        """
        https://moztrap.mozilla.org/manage/case/14447
        """
        VIDEO_RECORDING_DURATION = 5

        camera = Camera(self.marionette)
        camera.launch()

        # Switch to video mode and start recording
        camera.tap_switch_source()
        camera.tap_capture()

        # Wait before going to homescreen
        import time
        time.sleep(VIDEO_RECORDING_DURATION)
        self.device.touch_home_button()

        videoplayer = VideoPlayer(self.marionette)
        videoplayer.launch()
        videoplayer.wait_for_thumbnails_to_load(1)

        first_thumbnail_video_duration = videoplayer.thumbnails[0].total_duration_time

        import datetime
        # Convert video duration to seconds
        thumbnail_time_in_seconds = datetime.\
            timedelta(minutes=first_thumbnail_video_duration.tm_min,
                      seconds=first_thumbnail_video_duration.tm_sec).total_seconds()

        # Check that the recording duration is correct with a 1 seconds margin of error
        self.assertLessEqual(abs(thumbnail_time_in_seconds - VIDEO_RECORDING_DURATION), 1)

        fullscreen_video = videoplayer.tap_first_video_item()

        # Video will play automatically
        # We'll wait for the controls to clear so we're 'safe' to proceed
        time.sleep(2)

        # We cannot tap the toolbar so let's just enable it with javascript
        fullscreen_video.show_controls()
        recording_duration = fullscreen_video.total_duration_time

        # Convert video duration to seconds
        recording_time_in_seconds = datetime.\
            timedelta(minutes=recording_duration.tm_min,
                      seconds=recording_duration.tm_sec).total_seconds()

        # Check that the recording duration is correct with a 1 seconds margin of error
        self.assertLessEqual(abs(recording_time_in_seconds - VIDEO_RECORDING_DURATION), 1)
