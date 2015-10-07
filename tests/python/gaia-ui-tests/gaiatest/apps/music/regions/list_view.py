# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base, PageRegion
from gaiatest.apps.music.regions.sublist_view import SublistView
from gaiatest.apps.music.regions.player_view import PlayerView


class ListView(Base):

    _albums_view_locator = (By.CSS_SELECTOR, 'iframe.active[src*="/views/albums/index.html"]')
    _artists_view_locator = (By.CSS_SELECTOR, 'iframe.active[src*="/views/artists/index.html"]')
    _songs_view_locator = (By.CSS_SELECTOR, 'iframe.active[src*="/views/songs/index.html"]')
    _playlists_view_locator = (By.CSS_SELECTOR, 'iframe.active[src*="/views/playlists/index.html"]')
    _view_locator = (By.ID, 'list')
    _list_item_locator = (By.CLASS_NAME, 'gfl-item')

    def __init__(self, marionette, view_type):
        Base.__init__(self, marionette)
        if view_type is 'albums':
            self._view = self._albums_view_locator
        elif view_type is 'artists':
            self._view = self._artists_view_locator
        elif view_type is 'songs':
            self._view = self._songs_view_locator
        elif view_type is 'playlists':
            self._view = self._playlists_view_locator
        view = self.marionette.find_element(*self._view)
        Wait(self.marionette).until(expected.element_displayed(view))

    @property
    def media(self):
        self.marionette.switch_to_frame(self.marionette.find_element(*self._view))
        elements = Wait(self.marionette).until(
            expected.elements_present(*self._list_item_locator))
        Wait(self.marionette).until(expected.element_displayed(elements[0]))
        return [Media(self.marionette, element) for element in elements]


class Media(PageRegion):
    _first_media_link_locator = (By.CLASS_NAME, 'gfl-item first')

    def tap_first_album(self):
        self.marionette.find_element(*self._first_media_link_locator).tap()
        self.apps.switch_to_displayed_app()
        return SublistView(self.marionette, 'album')

    def tap_first_song(self):
        self.marionette.find_element(*self._first_media_link_locator).tap()
        self.apps.switch_to_displayed_app()
        return PlayerView(self.marionette)

    def tap_first_artist(self):
        self.marionette.find_element(*self._first_media_link_locator).tap()
        self.apps.switch_to_displayed_app()
        return SublistView(self.marionette, 'artist')

    def a11y_click_first_album(self):
        self.accessibility.click(
            self.marionette.find_element(*self._first_media_link_locator))
        self.apps.switch_to_displayed_app()
        return SublistView(self.marionette, 'album')
