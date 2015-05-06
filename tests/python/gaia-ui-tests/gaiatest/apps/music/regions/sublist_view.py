# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette import expected
from marionette import Wait
from marionette.by import By
from marionette.marionette import Actions

from gaiatest.apps.base import Base
from gaiatest.apps.music.regions.player_view import PlayerView


class SublistView(Base):

    _song_number_locator = (By.CSS_SELECTOR, 'bid.list-song-index')
    _play_control_locator = (By.ID, 'views-sublist-controls-play')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        element = self.marionette.find_element(*self._song_number_locator)
        Wait(self.marionette).until(lambda m: element.location['x'] == 0)

    def tap_play(self):
        play = Wait(self.marionette).until(
            expected.element_present(*self._play_control_locator))
        # TODO: Change this to a simple tap when bug 862156 is fixed
        Actions(self.marionette).tap(play).perform()
        return PlayerView(self.marionette)
