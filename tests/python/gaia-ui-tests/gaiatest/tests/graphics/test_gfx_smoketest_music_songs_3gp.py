# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time
from gaiatest.gaia_graphics_test import GaiaImageCompareTestCase
from gaiatest.apps.music.app import Music
from marionette.marionette import Actions
from marionette.by import By

class TestPlay3GPMusic(GaiaImageCompareTestCase):
    _player_controls_previous_locator = (By.ID, 'player-controls-previous')
    _player_controls_next_locator = (By.ID, 'player-controls-next')

    def setUp(self):
        GaiaImageCompareTestCase.setUp(self)

        # add video to storage
        self.push_resource('MUS_0001.3gp')

    def test_select_songs_play_3gp_file(self):
        """https://moztrap.mozilla.org/manage/case/4031/"""

        music_app = Music(self.marionette)
        music_app.launch()
        music_app.wait_for_music_tiles_displayed()
        self.invoke_screen_capture()

        # switch to songs view
        list_view = music_app.tap_songs_tab()

        # check that songs (at least one) are available
        songs = list_view.media
        self.assertGreater(len(songs), 0, 'The 3gp file could not be found')
        self.invoke_screen_capture()

        player_view = songs[0].tap_first_song()

        play_time = time.strptime('00:03', '%M:%S')
        self.wait_for_condition(
            lambda m: player_view.player_elapsed_time >= play_time,
            timeout=10,
            message='3gp sample did not start playing')

        # validate playback
        self.assertTrue(player_view.is_player_playing(), 'The player is not playing')

        # select stop, then FF to the end of the song
        player_view.tap_play()
        ff_button = self.marionette.find_element(*self._player_controls_next_locator)
        Actions(self.marionette).tap(ff_button).perform()
        self.invoke_screen_capture()

    def tearDown(self):
        GaiaImageCompareTestCase.tearDown(self)