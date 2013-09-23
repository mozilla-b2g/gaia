# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time
from marionette.by import By
from gaiatest import GaiaTestCase


class TestMusic(GaiaTestCase):

    _body_list_mode_locator = (By.CSS_SELECTOR, 'body.list-mode')

    _album_tile_locator = (By.CSS_SELECTOR, '#views-tiles div.tile-container')
    _album_list_locator = (By.CSS_SELECTOR, '#views-list li > a')
    _album_title_locator = ('class name', "list-main-title")
    _audio_locator = (By.ID, 'player-audio')
    _player_seek_elapsed_locator = (By.ID, 'player-seek-elapsed')
    _player_controls_play_locator = (By.ID, 'player-controls-play')
    _tab_albums_locator = (By.ID, 'tabs-albums')
    _views_player_locator = (By.ID, 'views-player')
    _views_sublist_controls_play_locator = (By.ID, 'views-sublist-controls-play')

    def setUp(self):
        GaiaTestCase.setUp(self)

        # add track to storage
        self.push_resource('MUS_0001.mp3')

        # launch the Music application
        self.app = self.apps.launch("music")

    def test_select_album_play(self):
        # https://moztrap.mozilla.org/manage/case/4031/

        # wait for music tiles to appear as indication of indexing
        self.wait_for_element_displayed(*self._album_tile_locator)

        # switch to albums view
        self.wait_for_element_displayed(*self._tab_albums_locator)
        self.marionette.find_element(*self._tab_albums_locator).tap()

        # wait for it to switch into list mode
        self.wait_for_element_present(*self._body_list_mode_locator)

        # check that albums (at least one) are available
        albums = self.marionette.find_elements(*self._album_list_locator)
        self.assertGreater(len(albums), 0, 'no albums found')

        # select an album
        self.marionette.find_element(*self._album_list_locator).tap()

        # select play
        # This wait is timing out because of bug 862156
        self.wait_for_element_displayed(*self._views_sublist_controls_play_locator)
        self.marionette.find_element(*self._views_sublist_controls_play_locator).tap()

        # play for a short duration
        self.wait_for_condition(
            lambda m: m.find_element(*self._player_seek_elapsed_locator).text == '00:05')

        audiotag = self.marionette.find_element(*self._audio_locator)

        self.assertNotEqual(audiotag.get_attribute('currentTime'), audiotag.get_attribute('duration'))

        # validate playback
        self.assertEqual(audiotag.get_attribute('paused'), 'false')

        # select stop
        self.marionette.find_element(*self._player_controls_play_locator).tap()

        # wait to be sure the pause settles in
        time.sleep(2)

        # validate stopped playback
        self.assertEqual(audiotag.get_attribute('paused'), 'true')
