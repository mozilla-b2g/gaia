# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest import GaiaTestCase
from gaiatest.apps.browser.app import Browser
from gaiatest.apps.browser.regions.html5_player import HTML5Player


class TestEmbeddedMP4Video(GaiaTestCase):

    _video_element_locator = (By.TAG_NAME, 'video')
    _play_button_locator = (By.ID, 'playVideo')
    _pause_button_locator = (By.ID, 'pauseVideo')

    def setUp(self):
        GaiaTestCase.setUp(self)

        self.connect_to_local_area_network()
        self.video_URL = self.marionette.absolute_url('embedded_mp4_video.html')

    def test_play_embedded_mp4_video(self):
        """Confirm embedded video tag playback
        https://moztrap.mozilla.org/manage/case/6073/
        """
        browser = Browser(self.marionette)
        browser.launch()
        browser.go_to_url(self.video_URL, timeout=180)
        browser.switch_to_content()

        # Wait HTML5 player to appear
        self.wait_for_element_displayed(*self._video_element_locator)
        video = self.marionette.find_element(*self._video_element_locator)
        player = HTML5Player(self.marionette, video)

        play_button = self.marionette.find_element(*self._play_button_locator)
        play_button.tap()
        # Wait/check that video is playing
        player.wait_for_video_playing()

        # Pause playback
        pause_button = self.marionette.find_element(*self._pause_button_locator)
        pause_button.tap()
        self.assertFalse(player.is_video_playing())
        stopped_at = player.current_timestamp

        # Resume playback
        play_button.tap()
        player.wait_for_video_playing()
