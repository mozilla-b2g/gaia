# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time

from gaiatest import GaiaTestCase


class TestVideoPlayer(GaiaTestCase):

    # Video list/summary view
    _video_items_locator = ('css selector', 'ul#thumbnails li[data-name]')
    _video_name_locator = ('css selector', 'p.name')

    # Video player fullscreen
    _video_frame_locator = ('id', 'videoFrame')
    _video_loaded_locator = ('css selector', 'video[style]')
    _video_title_locator = ('id', 'video-title')
    _elapsed_text_locator = ('id', 'elapsed-text')


    def setUp(self):
        GaiaTestCase.setUp(self)

        # unlock the lockscreen if it's locked
        self.lockscreen.unlock()

        # launch the Video app
        self.app = self.apps.launch('Video')
        self.wait_for_element_displayed(*self._video_items_locator)

    def test_play_video(self):
        # https://moztrap.mozilla.org/manage/case/2478/

        all_videos = self.marionette.find_elements(*self._video_items_locator)

        # Assert that there are more than one video available
        self.assertGreater(all_videos, 0)

        first_video = all_videos[0]
        first_video_name = first_video.find_element(*self._video_name_locator).text

        # click on the first video
        first_video.click()

        # Video will play automatically
        self.wait_for_element_displayed(*self._video_frame_locator)
        self.wait_for_element_displayed(*self._video_loaded_locator)

        # Tap to make toolbar visible
        self.marionette.tap(self.marionette.find_element(*self._video_frame_locator))

        # Let video play for one second
        time.sleep(1)

        # The elapsed time > 0:00 is the only indication of the video playing
        self.assertIsNotNone(self.marionette.find_element(*self._elapsed_text_locator).text)
        self.assertNotEqual(self.marionette.find_element(*self._elapsed_text_locator).text, "00:00")

        self.assertEqual(first_video_name,
                        self.marionette.find_element(*self._video_title_locator).text)

    def tearDown(self):

        # close the app
        if self.app:
            self.apps.kill(self.app)

        GaiaTestCase.tearDown(self)
