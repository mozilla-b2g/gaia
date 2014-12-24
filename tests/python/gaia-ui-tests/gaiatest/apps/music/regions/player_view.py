# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time

from marionette.by import By
from marionette.marionette import Actions
from marionette import Wait
from marionette import expected

from gaiatest.apps.base import Base


class PlayerView(Base):
    _audio_locator = (By.ID, 'player-audio')
    _player_seek_elapsed_locator = (By.ID, 'player-seek-elapsed')
    _player_controls_play_locator = (By.ID, 'player-controls-play')
    _cover_image_locator = (By.ID, 'player-cover-image')
    _rating_view_locator = (By.ID, 'player-album-rating')
    _stars_on_locator = (By.CSS_SELECTOR, '.rating-star.star-on')

    def tap_play(self):
        play_button = self.marionette.find_element(*self._player_controls_play_locator)
        # TODO: Change this to a simple tap when bug 862156 is fixed
        Actions(self.marionette).tap(play_button).perform()

    def tap_cover_in_player_view(self):
        self.marionette.find_element(*self._cover_image_locator).tap()

        Wait(self.marionette).until(expected.element_displayed(
            Wait(self.marionette).until(expected.element_present(*self._rating_view_locator))))

    def _get_star_locator(self, rating):
        return (By.CSS_SELECTOR, '.rating-star[data-rating="%s"]' % rating)

    def tap_star(self, rate):
        """
        give rating.  (After tapping the cover to make the ratings overlay appear)
        """

        self.tap_cover_in_player_view()
        self.marionette.find_element(*self._get_star_locator(rate)).tap()

    @property
    def star_rating(self):
        return len(self.marionette.find_elements(*self._stars_on_locator))

    @property
    def player_elapsed_time(self):
        return time.strptime(self.marionette.find_element(*self._player_seek_elapsed_locator).text, '%M:%S')

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
