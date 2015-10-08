# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time

from marionette_driver import expected, By, Wait
from gaiatest.apps.base import Base


class PlayerView(Base):
    _audio_locator = (By.ID, 'audio')
    _active_view_locator = (By.CSS_SELECTOR, 'iframe.active[src*="/views/player/index.html"]')
    _player_seek_elapsed_locator = (By.ID, 'elapsed-time')
    _player_controls_shadow_dom_locator = (By.ID, 'controls')
    _player_controls_play_locator = (By.ID, 'toggle')
    _cover_image_shadow_dom_locator = (By.ID, 'artwork')
    _seek_bar_shadow_dom_locator = (By.ID, 'seek-bar')
    _cover_share_locator = (By.CSS_SELECTOR, '[data-l10n-id="share-song"]')
    _rating_view_locator = (By.ID, 'rating')

    #_rating_view_locator = (By.CSS_SELECTOR, '#rating')
    _stars_on_locator = (By.CSS_SELECTOR, '.rating-star.star-on')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        self.marionette.switch_to_frame(self.marionette.find_element(*self._active_view_locator))
        element = self.marionette.find_element(*self._cover_image_shadow_dom_locator)
        Wait(self.marionette).until(lambda m: element.rect['x'] == 0 and element.is_displayed())
        self.apps.switch_to_displayed_app()

    def tap_play(self):
        self.marionette.switch_to_frame(self.marionette.find_element(*self._active_view_locator))
        self.marionette.switch_to_shadow_root(self.marionette.find_element(*self._player_controls_shadow_dom_locator))
        self.marionette.find_element(*self._player_controls_play_locator).tap()
        self.apps.switch_to_displayed_app()

    def tap_cover_in_player_view(self):
        self.marionette.switch_to_frame(self.marionette.find_element(*self._active_view_locator))
        self.marionette.switch_to_shadow_root(self.marionette.find_element(*self._cover_image_shadow_dom_locator))

        #wait until the overlay disappears
        Wait(self.marionette).until(expected.element_not_displayed(*self._rating_view_locator))
        self.marionette.switch_to_shadow_root()

        self.marionette.find_element(*self._cover_image_shadow_dom_locator).tap()
        self.marionette.switch_to_shadow_root(self.marionette.find_element(*self._cover_image_shadow_dom_locator))
        Wait(self.marionette).until(expected.element_displayed(
            Wait(self.marionette).until(expected.element_present(*self._rating_view_locator))))
        self.apps.switch_to_displayed_app()

    def tap_share_button(self):
        self.marionette.switch_to_frame(self.marionette.find_element(*self._active_view_locator))
        self.marionette.switch_to_shadow_root(self.marionette.find_element(*self._cover_image_shadow_dom_locator))
        self.marionette.find_element(*self._cover_share_locator).tap()
        from gaiatest.apps.system.regions.activities import Activities
        return Activities(self.marionette)

    def _get_star_locator(self, rating):
        return By.CSS_SELECTOR, 'button[value="%s"]' % rating

    def tap_star(self, rate):
        """
        give rating.  (After tapping the cover to make the ratings overlay appear)
        """
        self.tap_cover_in_player_view()
        self.marionette.switch_to_frame(self.marionette.find_element(*self._active_view_locator))
        self.marionette.switch_to_shadow_root(self.marionette.find_element(*self._cover_image_shadow_dom_locator))
        self.marionette.switch_to_shadow_root(self.marionette.find_element(*self._rating_view_locator))
        Wait(self.marionette).until(expected.element_displayed(*self._get_star_locator(rate)))
        self.marionette.find_element(*self._get_star_locator(rate)).tap()
        self.apps.switch_to_displayed_app()

    @property
    def star_rating(self):
        self.marionette.switch_to_frame(self.marionette.find_element(*self._active_view_locator))
        self.marionette.switch_to_shadow_root(self.marionette.find_element(*self._cover_image_shadow_dom_locator))
        rating = self.marionette.find_element(*self._rating_view_locator).get_attribute('value')
        self.apps.switch_to_displayed_app()
        return int(rating)

    @property
    def player_elapsed_time(self):
        self.marionette.switch_to_frame(self.marionette.find_element(*self._active_view_locator))
        self.marionette.switch_to_shadow_root(self.marionette.find_element(*self._seek_bar_shadow_dom_locator))
        Wait(self.marionette).until(expected.element_displayed(
            Wait(self.marionette).until(expected.element_present(*self._player_seek_elapsed_locator))))
        elapsed_time = time.strptime(self.marionette.find_element(*self._player_seek_elapsed_locator).text, '%M:%S')
        self.apps.switch_to_displayed_app()
        return elapsed_time

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
