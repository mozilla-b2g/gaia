# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By

from gaiatest.apps.base import Base, PageRegion
from gaiatest.apps.music.regions.sublist_view import SublistView


class ListView(Base):

    _album_list_item_locator = (By.CSS_SELECTOR, '.list-item')

    @property
    def albums(self):
        self.wait_for_element_displayed(*self._album_list_item_locator)
        return [Album(self.marionette, album) for album in
                self.marionette.find_elements(*self._album_list_item_locator)]


class Album(PageRegion):

    _album_link_locator = (By.TAG_NAME, 'a')

    def tap(self):
        self.marionette.find_element(*self._album_link_locator).tap()
        return SublistView(self.marionette)
