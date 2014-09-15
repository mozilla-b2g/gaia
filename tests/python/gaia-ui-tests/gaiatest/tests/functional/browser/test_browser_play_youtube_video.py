# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest import GaiaTestCase
from gaiatest.apps.search.app import Search
from gaiatest.apps.search.regions.html5_player import HTML5Player


class TestYouTube(GaiaTestCase):

    video_URL = 'http://m.youtube.com/watch?v=5MzuGWFIfio'
    acceptable_delay = 2.0

    # YouTube video locators
    _video_container_locator = (By.CSS_SELECTOR, 'div[style^="background-image"]')
    _video_element_locator = (By.TAG_NAME, 'video')

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.connect_to_network()
        self.apps.set_permission_by_url(Search.manifest_url, 'geolocation', 'deny')

    def test_play_youtube_video(self):
        """Confirm YouTube video playback

        https://moztrap.mozilla.org/manage/case/6073/
        """
        search = Search(self.marionette)
        search.launch()
        browser = search.go_to_url(self.video_URL)
        browser.wait_for_page_to_load(180)
        browser.switch_to_content()

        # Tap the video container to load the <video> element and start playing
        self.wait_for_element_displayed(*self._video_container_locator)
        self.marionette.find_element(*self._video_container_locator).tap()

        # Wait HTML5 player to appear
        self.wait_for_element_displayed(*self._video_element_locator)
        video = self.marionette.find_element(*self._video_element_locator)
        player = HTML5Player(self.marionette, video)

        # Check that video is playing
        player.wait_for_video_loaded()
        self.assertTrue(player.is_video_playing())

        # Pause playback
        player.pause()
        stopped_at = player.current_timestamp
        self.assertFalse(player.is_video_playing())

        # Resume playback
        player.play()
        resumed_at = player.current_timestamp
        self.assertTrue(player.is_video_playing())

        # Ensure that video resumes to play
        # from the place where it was paused
        delay = resumed_at - stopped_at
        self.assertLessEqual(delay, self.acceptable_delay,
                             'video resumed to play not from place where it was paused')
