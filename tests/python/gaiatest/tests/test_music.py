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
  _player_seek_elapsed_locator = ('id', 'player-seek-elapsed')
  _player_controls_play_locator = ('id', 'player-controls-play')
  _tab_albums_locator = ('id', 'tabs-albums')
  _views_player_locator = ('id', 'views-player')
  _views_sublist_controls_play_locator = ('id', 'views-sublist-controls-play')


  def setUp(self):
      GaiaTestCase.setUp(self)

      self.lockscreen.unlock()

      # launch the Music application
      self.app = self.apps.launch("music")

  def test_select_album_play(self):
      # https://moztrap.mozilla.org/manage/case/4031/

      # wait for music tiles to appear as indication of indexing
      self.wait_for_element_displayed(*self._album_tile_locator, timeout=60)

      # switch to albums view
      self.marionette.find_element(*self._tab_albums_locator).click()

      # wait for it to switch into list mode
      self.wait_for_element_present(*self._body_list_mode_locator)

      # check that albums (at least one) are available
      albums = self.marionette.find_elements(*self._album_list_locator)
      self.assertGreater(len(albums), 0, 'no albums found')

      # select an album
      self.marionette.find_element(*self._album_list_locator).click()

      # select play
      self.marionette.find_element(*self._views_sublist_controls_play_locator).click()

      # play for a short duration
      self.wait_for_condition(lambda m: m.find_element(
          *self._player_seek_elapsed_locator).text == '00:05')

      # select stop
      self.marionette.find_element(*self._player_controls_play_locator).click()

      # TODO
      # Validate audio playback

  def tearDown(self):
      # close the app
      if hasattr(self, 'app'):
          self.apps.kill(self.app)

      GaiaTestCase.tearDown(self)
