# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time
from gaiatest import GaiaTestCase
from gaiatest.apps.music.app import Music


class TestMusic(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

        # add track to storage
        self.push_resource('MUS_0001.mp3')

    def test_select_artist_play(self):
        """
        https://moztrap.mozilla.org/manage/case/4031/
        """

        music_app = Music(self.marionette)
        music_app.launch()
        music_app.wait_for_music_tiles_displayed()

        # switch to artists view
        list_view = music_app.tap_artists_tab()

        # check that artists (at least one) are available
        artists = list_view.media
        self.assertGreater(len(artists), 0, 'The mp3 file could not be found')

        # select an artist
        sublist_view = artists[0].tap_first_artist()

        # select play
        # This wait is timing out because of bug 862156
        player_view = sublist_view.tap_first_song()

        # play for a short duration
        play_time = time.strptime('00:03', '%M:%S')
        self.wait_for_condition(
            lambda m: player_view.player_elapsed_time >= play_time,
            timeout=10,
            message='Mp3 sample did not start playing')

        # validate playback
        self.assertTrue(player_view.is_player_playing(), 'The player is not playing')

        # select stop
        player_view.tap_play()

        # validate stopped playback
        self.assertFalse(player_view.is_player_playing(), 'The player did not stop playing')
