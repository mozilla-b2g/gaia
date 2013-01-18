# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
import time


class TestMusic(GaiaTestCase):

    _body_list_mode_locator = ('css selector', 'body.list-mode')

    _album_tile_locator = ('css selector', '#views-tiles div.tile-container')
    _album_list_locator = ('css selector', '#views-list li > a')
    _album_title_locator = ('class name', "list-main-title")
    _audio_locator = ('id', 'player-audio')
    _player_seek_elapsed_locator = ('id', 'player-seek-elapsed')
    _player_controls_play_locator = ('id', 'player-controls-play')
    _tab_albums_locator = ('id', 'tabs-albums')
    _views_player_locator = ('id', 'views-player')
    _views_sublist_controls_play_locator = ('id', 'views-sublist-controls-play')

    def setUp(self):
        GaiaTestCase.setUp(self)

        # add track to storage
        self.push_resource('MUS_0001.mp3')

        # launch the Music application
        self.app = self.apps.launch("music")

    def test_select_album_play(self):
        # https://moztrap.mozilla.org/manage/case/4031/

        # wait for music tiles to appear as indication of indexing
        self.wait_for_element_displayed(*self._album_tile_locator, timeout=60)

        # switch to albums view
        tab_albums = self.marionette.find_element(*self._tab_albums_locator)
        self.marionette.tap(tab_albums)

        # wait for it to switch into list mode
        self.wait_for_element_present(*self._body_list_mode_locator)

        # check that albums (at least one) are available
        albums = self.marionette.find_elements(*self._album_list_locator)
        self.assertGreater(len(albums), 0, 'no albums found')

        # select an album
        album_list = self.marionette.find_element(*self._album_list_locator)
        self.marionette.tap(album_list)

        # need a wait but cannot due to an is_displayed bug
        time.sleep(2)

        # select play
        views_sublist_controls_play = self.marionette.find_element(*self._views_sublist_controls_play_locator)
        self.marionette.tap(views_sublist_controls_play)

        # play for a short duration
        self.wait_for_condition(
            lambda m: m.find_element(*self._player_seek_elapsed_locator).text == '00:05')

        audiotag = self.marionette.find_element(*self._audio_locator)

        self.assertNotEqual(audiotag.get_attribute('currentTime'), audiotag.get_attribute('duration'))

        # validate playback
        self.assertEqual(audiotag.get_attribute('paused'), 'false')

        # select stop
        player_controls_play = self.marionette.find_element(*self._player_controls_play_locator)
        self.marionette.tap(player_controls_play)

        # wait to be sure the pause settles in
        time.sleep(2)

        # validate stopped playback
        self.assertEqual(audiotag.get_attribute('paused'), 'true')
