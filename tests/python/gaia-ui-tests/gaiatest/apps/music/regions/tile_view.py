# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base
from gaiatest.apps.music.regions.player_view import PlayerView


class TileView(Base):

    _main_tile_locator = (By.CSS_SELECTOR, '.main-tile')
    _sub_tile_locator = (By.CSS_SELECTOR, '.sub-tile')

    def __init__(self, marionette):
        Base.__init__(self, marionette)

        # there are two type of tiles - main and sub.  There should be at least one main tile
        Wait(self.marionette).until(expected.element_displayed(
            *self._main_tile_locator))

    def tap_main_song(self):
        self.marionette.find_element(*self._main_tile_locator).tap()
        return PlayerView(self.marionette)

    def tap_sub_song(self, order):
        sub_tiles = Wait(self.marionette).until(
            expected.elements_present(*self._sub_tile_locator))

        sub_tiles[order].tap()
        return PlayerView(self.marionette)
