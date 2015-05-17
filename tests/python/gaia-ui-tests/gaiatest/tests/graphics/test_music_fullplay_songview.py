# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time

from marionette_driver import By, Wait

from gaiatest.gaia_graphics_test import GaiaImageCompareTestCase
from gaiatest.apps.music.regions.tile_view import TileView
from gaiatest.apps.music.app import Music


class TestFullPlayMusic(GaiaImageCompareTestCase):
    _main_song_tile = (By.CSS_SELECTOR, '.main-tile')

    def setUp(self):
        GaiaImageCompareTestCase.setUp(self)

        self.push_resource('MUS_0001.mp3')
        self.push_resource('MUS_0001.3gp')

    def test_music_songview_fullplay(self):
        """
        play a song until the end in the song list view
        """

        music_app = Music(self.marionette)
        music_app.launch()
        music_app.wait_for_music_tiles_displayed()
        self.take_screenshot()

        # switch to songs view and play it from there too
        list_view = music_app.tap_songs_tab()
        music_app.wait_for_view_displayed('Songs')
        self.take_screenshot()
        songs = list_view.media
        from_list_player_view = songs[0].tap_first_song()

        play_time = time.strptime('00:20', '%M:%S')
        Wait(self.marionette, timeout=30).until(
            lambda m: from_list_player_view.player_elapsed_time >= play_time,
            message='song did not reach the end')

        # wait until next song kicks in (elapsed time will reset)
        Wait(self.marionette, timeout = 30).until(
            lambda m: from_list_player_view.player_elapsed_time < play_time,
            message='next song did not start')

        # once the first song completes, it will play the next song automatically
        play_time = time.strptime('00:13', '%M:%S')
        Wait(self.marionette, timeout=20).until(
            lambda m: from_list_player_view.player_elapsed_time >= play_time,
            message='song did not reach the end')

        music_app.wait_for_view_displayed('Songs')
        self.take_screenshot()
