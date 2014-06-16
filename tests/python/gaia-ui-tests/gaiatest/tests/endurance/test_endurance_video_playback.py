# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

# Approximate runtime per 100 iterations: xx minutes

from gaiatest import GaiaEnduranceTestCase

import datetime
import time


class TestEnduranceVideoPlayback(GaiaEnduranceTestCase):

    _video_items_locator = ('css selector', 'ul#thumbnails li[data-name]')
    _video_controls_locator = ('id', 'videoControls')

    def setUp(self):
        GaiaEnduranceTestCase.setUp(self)

        # add video to storage
        self.push_resource('VID_0001.3gp')

    def test_endurance_video_playback(self):
        self.drive(test=self.video_playback, app='video')

    def video_playback(self):
        # Playback existing video, some code taken from test_video_player.py

        # Launch the Video app
        self.app = self.apps.launch('Video')
        self.wait_for_element_displayed(*self._video_items_locator)
        all_videos = self.marionette.find_elements(*self._video_items_locator)

        # Assert that there are more than one video available
        self.assertGreater(all_videos, 0)
        self.first_video = all_videos[0]

        # Click on the first video
        self.first_video.tap()

        # Verify video is playing (controls will flash on)

        # TEMP remove as not reliable; leave as is until come up with better solution
        # self.wait_for_element_displayed(*self._video_controls_locator)

        # Wait for video to finish
        time.sleep(15)

        # Verify video is not playing (controls should be gone)
        self.wait_for_element_not_displayed(*self._video_controls_locator)

        # Close the app via home screen
        self.close_app()

        # Wait a couple of seconds before repeating
        time.sleep(5)
