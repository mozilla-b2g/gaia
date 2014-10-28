# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.music.app import Music

class TestA11yMusicResumeTrack(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

        # add track to storage
        self.push_resource('MUS_0001.mp3')

    def test_music_resume_track(self):

        music_app = Music(self.marionette)
        music_app.launch()
        music_app.wait_for_music_tiles_displayed()

        # switch to songs view
        list_view = music_app.tap_songs_tab()

        # check that songs (at least one) are available
        songs = list_view.media
        self.assertGreater(len(songs), 0, 'The mp3 file could not be found')

        player_view = songs[0].tap_first_song()

        play_time = time.strptime('00:03', '%M:%S')
        self.wait_for_condition(
            lambda m: player_view.player_elapsed_time >= play_time,
            timeout=10,
            message='mp3 sample did not start playing')

        # validate playback
        self.assertTrue(player_view.is_player_playing(), 'The player is not playing')

        # select stop
        player_view.tap_play()

        # validate stopped playback
        self.assertFalse(player_view.is_player_playing(), 'The player did not stop playing')

        # a11y click on the grid tab
        self.accessibility.click(music_app._grid_tab_locator)

        # a11y click on the 'Play circle'
        self.accessibility.click(music_app._play_circle_locator)

        # check whether track resumes
        self.assertTrue(player_view.is_player_playing(), 'The player did not resume playing')
