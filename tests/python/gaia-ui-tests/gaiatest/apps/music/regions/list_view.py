# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base, PageRegion
from gaiatest.apps.music.regions.sublist_view import AlbumSublistView, ArtistSublistView
from gaiatest.apps.music.regions.player_view import PlayerView


class ListView(Base):

    _list_item_locator = (By.CLASS_NAME, 'gfl-item')

    def _set_active_view_locator(self, type):
        self._active_view_locator = (By.CSS_SELECTOR, 'iframe.active[src*="/views/{}/index.html"]'.format(type))

    @property
    def media(self):
        self.marionette.switch_to_frame(self.marionette.find_element(*self._active_view_locator))
        elements = Wait(self.marionette).until(
            expected.elements_present(*self._list_item_locator))
        Wait(self.marionette).until(expected.element_displayed(elements[0]))
        self.apps.switch_to_displayed_app()
        return [Media(self.marionette, element, self._active_view_locator) for element in elements]


class AlbumsView(ListView):
    def __init__(self, marionette):
        ListView.__init__(self, marionette)
        self._set_active_view_locator('albums')


class ArtistsView(ListView):
    def __init__(self, marionette):
        ListView.__init__(self, marionette)
        self._set_active_view_locator('artists')


class SongsView(ListView):
    def __init__(self, marionette):
        ListView.__init__(self, marionette)
        self._set_active_view_locator('songs')


class Media(PageRegion):
    _first_media_link_locator = (By.CLASS_NAME, 'gfl-item first')

    def __init__(self, marionette, element, _active_view_locator):
        PageRegion.__init__(self, marionette, element)
        self._active_view_locator = _active_view_locator

    def switch_to_active_view(self):
        self.marionette.switch_to_frame(self.marionette.find_element(*self._active_view_locator))

    def tap_first_album(self):
        self.switch_to_active_view()
        self.marionette.find_element(*self._first_media_link_locator).tap()
        self.apps.switch_to_displayed_app()
        return AlbumSublistView(self.marionette)

    def tap_first_song(self):
        self.switch_to_active_view()
        self.marionette.find_element(*self._first_media_link_locator).tap()
        self.apps.switch_to_displayed_app()
        return PlayerView(self.marionette)

    def tap_first_artist(self):
        self.switch_to_active_view()
        self.marionette.find_element(*self._first_media_link_locator).tap()
        self.apps.switch_to_displayed_app()
        return ArtistSublistView(self.marionette)

    def a11y_click_first_album(self):
        self.switch_to_active_view()
        self.accessibility.click(
            self.marionette.find_element(*self._first_media_link_locator))
        self.apps.switch_to_displayed_app()
        return AlbumSublistView(self.marionette)
