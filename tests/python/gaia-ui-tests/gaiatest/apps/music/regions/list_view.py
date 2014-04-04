# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By

from gaiatest.apps.base import Base, PageRegion
from gaiatest.apps.music.regions.sublist_view import SublistView
from gaiatest.apps.music.regions.player_view import PlayerView


class ListView(Base):

    _list_item_locator = (By.CSS_SELECTOR, '.list-item')

    @property
    def media(self):
        self.wait_for_element_displayed(*self._list_item_locator)
        return [Media(self.marionette, media) for media in
                self.marionette.find_elements(*self._list_item_locator)]


class Media(PageRegion):

    _media_link_locator = (By.TAG_NAME, 'a')

    def tap_first_album(self):
        self.marionette.find_element(*self._media_link_locator).tap()
        return SublistView(self.marionette)

    def tap_first_song(self):
        self.marionette.find_element(*self._media_link_locator).tap()
        return PlayerView(self.marionette)
