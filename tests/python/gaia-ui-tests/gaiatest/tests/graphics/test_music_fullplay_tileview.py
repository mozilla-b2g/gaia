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

    def test_music_songs_tileview_fullplay(self):
        """
        play a song until the end in the tile view
        """

        music_app = Music(self.marionette)
        music_app.launch()
        music_app.wait_for_music_tiles_displayed()
        self.take_screenshot()

        songs = TileView(self.marionette)
        main_song_player_view = songs.tap_main_song()
        play_time = time.strptime('00:20', '%M:%S')
        Wait(self.marionette, timeout=30).until(
            lambda m: main_song_player_view.player_elapsed_time >= play_time,
            message='song did not reach the end')
        music_app.wait_for_music_tiles_displayed()
        self.take_screenshot()

        # Once the song is done, it'll return to the tile view
        sub_song_player_view = songs.tap_sub_song(0)
        play_time = time.strptime('00:10', '%M:%S')
        Wait(self.marionette, timeout=20).until(
            lambda m: sub_song_player_view.player_elapsed_time >= play_time,
            message = 'song did not reach the end')
        music_app.wait_for_music_tiles_displayed()
        self.take_screenshot()
