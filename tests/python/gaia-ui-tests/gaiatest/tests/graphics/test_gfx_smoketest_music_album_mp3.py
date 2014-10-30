# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time
from marionette.by import By
from gaiatest.gaia_graphics_test import GaiaImageCompareTestCase
from gaiatest.apps.music.app import Music
from marionette.marionette import Actions

class TestMusic(GaiaImageCompareTestCase):
    _player_controls_previous_locator = (By.ID, 'player-controls-previous')
    _player_controls_next_locator = (By.ID, 'player-controls-next')

    def setUp(self):
        GaiaImageCompareTestCase.setUp(self)

        # add track to storage
        self.push_resource('MUS_0001.mp3')

    def test_select_album_play(self):
        """
        https://moztrap.mozilla.org/manage/case/4031/
        """

        music_app = Music(self.marionette)
        music_app.launch()
        music_app.wait_for_music_tiles_displayed()
        self.invoke_screen_capture()

        # switch to albums view
        list_view = music_app.tap_albums_tab()
        self.invoke_screen_capture()

        # check that albums (at least one) are available
        albums = list_view.media
        self.assertGreater(len(albums), 0, 'The mp3 file could not be found')

        # select an album
        sublist_view = albums[0].tap_first_album()
        self.invoke_screen_capture()
        # select play
        # This wait is timing out because of bug 862156
        player_view = sublist_view.tap_play()
        # play for a short duration
        play_time = time.strptime('00:03', '%M:%S')
        self.wait_for_condition(
            lambda m: player_view.player_elapsed_time >= play_time,
            timeout = 10,
            message = 'Mp3 sample did not start playing')

        ff_button = self.marionette.find_element(*self._player_controls_next_locator)
        Actions(self.marionette).tap(ff_button).perform()
        self.invoke_screen_capture()

    def tearDown(self):
        GaiaImageCompareTestCase.tearDown(self)
