# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base
from gaiatest.apps.music.regions.player_view import PlayerView


class SublistView(Base):

    _list_locator = (By.ID, 'list')
    _first_song_locator = (By.CLASS_NAME, 'gfl-item first')

    def _set_active_view(self, type):
        self._active_view_locator = (By.CSS_SELECTOR, 'iframe.active[src*="/views/{}-detail/index.html"]'.format(type))

    def switch_to_active_view(self):
        self.marionette.switch_to_frame(self.marionette.find_element(*self._active_view_locator))

    def wait_sublist_view_draw(self):
        active_view = self.marionette.find_element(*self._active_view_locator)
        Wait(self.marionette).until(expected.element_displayed(active_view))
        self.marionette.switch_to_frame(active_view)

        element = self.marionette.find_element(*self._list_locator)
        Wait(self.marionette).until(lambda m: element.rect['x'] == 0 and element.is_displayed())
        self.apps.switch_to_displayed_app()

    def tap_first_song(self):
        self.switch_to_active_view()
        song = Wait(self.marionette).until(
            expected.element_present(*self._first_song_locator))
        song.tap()
        self.apps.switch_to_displayed_app()
        return PlayerView(self.marionette)


class AlbumSublistView(SublistView):
    def __init__(self, marionette):
        Base.__init__(self, marionette)
        self._set_active_view('album')
        self.wait_sublist_view_draw()


class ArtistSublistView(SublistView):
    def __init__(self, marionette):
        Base.__init__(self, marionette)
        self._set_active_view('artist')
        self.wait_sublist_view_draw()