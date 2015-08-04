# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base
from gaiatest.apps.music.regions.list_view import ListView


class Music(Base):

    name = 'Music'
    origin = 'app://music.gaiamobile.org'

    _loading_spinner_locator = (By.ID, 'spinner-overlay')
    _music_tiles_locator = (By.CSS_SELECTOR, '#views-tiles-anchor > div')
    _views_locator = (By.ID, 'views')
    _tabs_locator = (By.ID, 'tabs')
    _empty_music_title_locator = (By.ID, 'overlay-title')
    _empty_music_text_locator = (By.ID, 'overlay-text')
    _albums_tab_locator = (By.ID, 'tabs-albums')
    _songs_tab_locator = (By.ID, 'tabs-songs')
    _artists_tab_locator = (By.ID, 'tabs-artists')
    _title_locator = (By.ID, 'title-text')

    def launch(self):
        Base.launch(self)
        Wait(self.marionette).until(expected.element_not_displayed(
            *self._loading_spinner_locator))

    def wait_for_music_tiles_displayed(self):
        Wait(self.marionette).until(expected.element_displayed(
            *self._music_tiles_locator))

    def wait_for_empty_message_to_load(self):
        element = self.marionette.find_element(*self._empty_music_title_locator)
        Wait(self.marionette).until(lambda m: not element.text == '')

    def wait_for_view_displayed(self, view_name):
        title = self.marionette.find_element(*self._title_locator)
        Wait(self.marionette).until(expected.element_displayed(title))
        Wait(self.marionette).until(lambda m: title.text == view_name)

    @property
    def empty_music_title(self):
        return self.marionette.find_element(*self._empty_music_title_locator).text

    @property
    def empty_music_text(self):
        return self.marionette.find_element(*self._empty_music_text_locator).text

    @property
    def views(self):
        return self.marionette.find_element(*self._views_locator)

    @property
    def tabs(self):
        return self.marionette.find_element(*self._tabs_locator)

    def tap_albums_tab(self):
        element = Wait(self.marionette).until(
            expected.element_present(*self._albums_tab_locator))
        Wait(self.marionette).until(expected.element_displayed(element))
        element.tap()
        return ListView(self.marionette)

    def tap_songs_tab(self):
        element = Wait(self.marionette).until(
            expected.element_present(*self._songs_tab_locator))
        Wait(self.marionette).until(expected.element_displayed(element))
        element.tap()
        return ListView(self.marionette)

    def tap_artists_tab(self):
        element = Wait(self.marionette).until(
            expected.element_present(*self._artists_tab_locator))
        Wait(self.marionette).until(expected.element_displayed(element))
        element.tap()
        return ListView(self.marionette)

    def a11y_click_albums_tab(self):
        element = Wait(self.marionette).until(
            expected.element_present(*self._albums_tab_locator))
        Wait(self.marionette).until(expected.element_displayed(element))
        self.accessibility.click(element)
        return ListView(self.marionette)

