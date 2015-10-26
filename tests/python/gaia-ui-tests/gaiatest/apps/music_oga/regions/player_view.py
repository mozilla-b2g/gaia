# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time

from marionette_driver import expected, By, Wait
from marionette_driver.marionette import Actions

from gaiatest.apps.base import Base


class PlayerView(Base):
    _audio_locator = (By.ID, 'player-audio')
    _player_seek_elapsed_locator = (By.ID, 'player-seek-elapsed')
    _player_controls_play_locator = (By.ID, 'player-controls-play')
    _cover_image_locator = (By.CSS_SELECTOR, '.cover-image.visible')
    _cover_share_locator = (By.ID, 'player-cover-share')
    _rating_view_locator = (By.ID, 'player-album-rating')
    _stars_on_locator = (By.CSS_SELECTOR, '.rating-star.star-on')

    def tap_play(self):
        self.marionette.find_element(*self._player_controls_play_locator).tap()

    def tap_cover_in_player_view(self):
        self.marionette.find_element(*self._cover_image_locator).tap()

        Wait(self.marionette).until(expected.element_displayed(
            Wait(self.marionette).until(expected.element_present(*self._rating_view_locator))))

    def tap_share_button(self):
        self.tap_cover_in_player_view()
        self.marionette.find_element(*self._cover_share_locator).tap()
        from gaiatest.apps.system.regions.activities import Activities
        return Activities(self.marionette)

    def _get_star_locator(self, rating):
        return By.CSS_SELECTOR, '.rating-star[data-rating="%s"]' % rating

    def tap_star(self, rate):
        """
        give rating.  (After tapping the cover to make the ratings overlay appear)
        """

        self.tap_cover_in_player_view()
        Wait(self.marionette).until(expected.element_displayed(*self._get_star_locator(rate)))
        self.marionette.find_element(*self._get_star_locator(rate)).tap()

    @property
    def star_rating(self):
        return len(self.marionette.find_elements(*self._stars_on_locator))

    @property
    def player_elapsed_time(self):
        Wait(self.marionette).until(expected.element_displayed(
            Wait(self.marionette).until(expected.element_present(*self._player_seek_elapsed_locator))))
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
