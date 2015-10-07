# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base
from gaiatest.apps.music.regions.player_view import PlayerView


class SublistView(Base):

    _album_sublist_view_locator = (By.CSS_SELECTOR, 'iframe.active[src*="/views/album-detail/index.html"]')
    _artist_sublist_view_locator = (By.CSS_SELECTOR, 'iframe.active[src*="/views/artist-detail/index.html"]')
    _album_list_locator = (By.ID, 'list')
    _first_song_locator = (By.CLASS_NAME, 'gfl-item first')

    def __init__(self, marionette, sublist_type):
        Base.__init__(self, marionette)
        if sublist_type == 'album':
            self._view = self._album_sublist_view_locator
        elif sublist_type == 'artist':
            self._view = self._artist_sublist_view_locator

        element = self.marionette.find_element(*self._view)
        Wait(self.marionette).until(expected.element_displayed(element))
        self.marionette.switch_to_frame(element)

        element = self.marionette.find_element(*self._album_list_locator)
        Wait(self.marionette).until(lambda m: element.location['x'] == 0)
        self.apps.switch_to_displayed_app()

    def tap_first_song(self):
        self.marionette.switch_to_frame(self.marionette.find_element(*self._view))
        play = Wait(self.marionette).until(
            expected.element_present(*self._first_song_locator))
        play.tap()
        self.apps.switch_to_displayed_app()
        return PlayerView(self.marionette)
