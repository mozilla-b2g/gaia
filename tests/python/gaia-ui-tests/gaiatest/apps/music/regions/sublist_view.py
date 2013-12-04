# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from marionette.marionette import Actions

from gaiatest.apps.base import Base
from gaiatest.apps.music.regions.player_view import PlayerView


class SublistView(Base):

    _song_number_locator = (By.CSS_SELECTOR, 'span.list-song-index')
    _play_control_locator = (By.ID, 'views-sublist-controls-play')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        self.wait_for_condition(lambda m: m.find_element(*self._song_number_locator).location['x'] == 0)

    def tap_play(self):
        play_button = self.wait_for_element_present(*self._play_control_locator)
        # TODO: Change this to a simple tap when bug 862156 is fixed
        Actions(self.marionette).tap(play_button).perform()
        return PlayerView(self.marionette)
