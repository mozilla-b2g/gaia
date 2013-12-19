# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time

from marionette.by import By
from marionette.marionette import Actions

from gaiatest.apps.base import Base


class PlayerView(Base):

    _audio_locator = (By.ID, 'player-audio')
    _player_seek_elapsed_locator = (By.ID, 'player-seek-elapsed')
    _player_controls_play_locator = (By.ID, 'player-controls-play')

    def tap_play(self):
        play_button = self.marionette.find_element(*self._player_controls_play_locator)
        # TODO: Change this to a simple tap when bug 862156 is fixed
        Actions(self.marionette).tap(play_button).perform()

    @property
    def player_elapsed_time(self):
        return self.marionette.find_element(*self._player_seek_elapsed_locator).text

    def is_player_playing(self):
        # get 4 timestamps during approx. 1 sec
        # ensure that newer timestamp has greater value than previous one
        timestamps = []
        for i in range(4):
            timestamps.append(self.player_current_timestamp)
            time.sleep(.25)
        return all([timestamps[i - 1] < timestamps[i] for i in range(1, 3)])

    @property
    def player_current_timestamp(self):
        player = self.marionette.find_element(*self._audio_locator)
        return float(player.get_attribute('currentTime'))

    @property
    def player_playback_duration(self):
        player = self.marionette.find_element(*self._audio_locator)
        return float(player.get_attribute('duration'))
