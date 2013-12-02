# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By

from gaiatest.apps.base import Base
from gaiatest.apps.music.regions.player_view import PlayerView


class SublistView(Base):

    _play_control_locator = (By.ID, 'views-sublist-controls-play')

    def tap_play(self):
        self.wait_for_element_displayed(*self._play_control_locator)
        self.marionette.find_element(*self._play_control_locator).tap()
        return PlayerView(self.marionette)
