# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaEnduranceTestCase

import os
import datetime
import time


class TestEnduranceMusicPlayback(GaiaEnduranceTestCase):

    _body_list_mode_locator = ('css selector', 'body.list-mode')
    _album_tile_locator = ('css selector', '#views-tiles div.tile-container')
    _album_list_locator = ('css selector', '#views-list li > a')
    _audio_locator = ('id', 'player-audio')
    _player_seek_elapsed_locator = ('id', 'player-seek-elapsed')
    _player_controls_play_locator = ('id', 'player-controls-play')
    _tab_albums_locator = ('id', 'tabs-albums')
    _views_player_locator = ('id', 'views-player')
    _views_sublist_controls_play_locator = ('id', 'views-sublist-controls-play')
    _back_header_button_locator = ('css selector', '#title-back')

    def setUp(self):
        GaiaEnduranceTestCase.setUp(self)

        # add track to storage
        self.push_resource('MUS_0001.mp3')

        # launch the Music application
        self.app = self.apps.launch("music")
        
        # wait for music tiles to appear as indication of indexing
        self.wait_for_element_displayed(*self._album_tile_locator, timeout=60)

        # switch to albums view
        tab_albums = self.marionette.find_element(*self._tab_albums_locator)
        tab_albums.tap()     

        # wait for it to switch into list mode
        self.wait_for_element_present(*self._body_list_mode_locator)

        # check that albums (at least one) are available
        self.wait_for_element_present(*self._album_list_locator)
        albums = self.marionette.find_elements(*self._album_list_locator)
        self.assertGreater(len(albums), 0, 'no albums found')

        # select an album
        album_list = self.marionette.find_element(*self._album_list_locator)
        album_list.tap()

    def test_endurance_add_event(self):
        self.drive(test=self.music_playback, app='music')

    def music_playback(self):
        # Play music for 5 seconds and verify via UI; most code taken from test_music.py

        # need a wait but cannot due to an is_displayed bug
        time.sleep(2)

        # select play
        views_sublist_controls_play = self.marionette.find_element(*self._views_sublist_controls_play_locator)
        views_sublist_controls_play.tap()

        # need to allow timer text to clear back to 00:00
        self.wait_for_condition(
            lambda m: m.find_element(*self._player_seek_elapsed_locator).text == '00:00')

        # play for a short duration
        self.wait_for_condition(
            lambda m: m.find_element(*self._player_seek_elapsed_locator).text == '00:05')

        audiotag = self.marionette.find_element(*self._audio_locator)

        self.assertNotEqual(audiotag.get_attribute('currentTime'), audiotag.get_attribute('duration'))

        # validate playback
        self.assertEqual(audiotag.get_attribute('paused'), 'false')

        # select stop
        player_controls_play = self.marionette.find_element(*self._player_controls_play_locator)
        player_controls_play.tap()

        # wait to be sure the pause settles in
        time.sleep(2)

        # validate stopped playback
        self.assertEqual(audiotag.get_attribute('paused'), 'true')

        # exit back to albums list, so can start again at next iteration
        back_header_button = self.marionette.find_element(*self._back_header_button_locator)
        back_header_button.tap()
