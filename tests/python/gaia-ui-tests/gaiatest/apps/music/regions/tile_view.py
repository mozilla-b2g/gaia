# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base
from gaiatest.apps.music.regions.player_view import PlayerView


class TileView(Base):

    _active_view_locator = (By.CSS_SELECTOR, 'iframe.active[src*="/views/home/index.html"]')
    _tile_group_locator = (By.ID, 'tiles')

    def __init__(self, marionette):
        Base.__init__(self, marionette)

        # there are two type of tiles - main and sub.  There should be at least one main tile
        self.marionette.switch_to_frame(self.marionette.find_element(*self._active_view_locator))
        Wait(self.marionette).until(expected.element_displayed(*self._tile_group_locator))
        self.apps.switch_to_displayed_app()

    def tap_song(self, filename):
        self.marionette.switch_to_frame(self.marionette.find_element(*self._active_view_locator))
        _pick_tile_locator = (By.CSS_SELECTOR, '.tile[data-file-path$="{}"]'.format(filename))
        self.marionette.find_element(*_pick_tile_locator).tap()
        self.apps.switch_to_displayed_app()
        return PlayerView(self.marionette)
