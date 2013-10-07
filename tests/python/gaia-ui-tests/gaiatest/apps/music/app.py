# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By

from gaiatest.apps.base import Base
from gaiatest.apps.music.regions.list_view import ListView


class Music(Base):

    name = 'Music'

    _loading_spinner_locator = (By.ID, 'spinner-overlay')
    _empty_music_title_locator = (By.ID, 'overlay-title')
    _empty_music_text_locator = (By.ID, 'overlay-text')
    _albums_tab_locator = (By.ID, 'tabs-albums')

    def launch(self):
        Base.launch(self)
        self.wait_for_element_not_displayed(*self._loading_spinner_locator)

    def wait_for_empty_message_to_load(self):
        empty_title = self.marionette.find_element(*self._empty_music_title_locator)
        self.wait_for_condition(lambda m: empty_title.text != '')

    @property
    def empty_music_title(self):
        return self.marionette.find_element(*self._empty_music_title_locator).text

    @property
    def empty_music_text(self):
        return self.marionette.find_element(*self._empty_music_text_locator).text

    def tap_albums_tab(self):
        self.wait_for_element_displayed(*self._albums_tab_locator)
        self.marionette.find_element(*self._albums_tab_locator).tap()
        return ListView(self.marionette)
