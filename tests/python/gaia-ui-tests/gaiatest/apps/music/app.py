# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base
from gaiatest.apps.music.regions.list_view import ListView


class Music(Base):

    name = 'Music'
    manifest_url = '{}music{}/manifest.webapp'.format(Base.DEFAULT_PROTOCOL, Base.DEFAULT_APP_HOSTNAME)

    _loading_spinner_locator = (By.ID, 'spinner-overlay')
    _active_view_locator = (By.CSS_SELECTOR, '.active')
    _music_tiles_locator = (By.ID, 'tiles')
    _views_locator = (By.ID, 'views')
    _tabs_locator = (By.ID, 'tabs')
    _empty_overlay_shadow_DOM_locator = (By.ID, 'empty-overlay')
    _empty_music_title_locator = (By.CSS_SELECTOR, '[data-l10n-id="empty-title"]')
    _empty_music_text_locator = (By.CSS_SELECTOR, '[data-l10n-id="empty-text"]')
    _albums_tab_locator = (By.CSS_SELECTOR, '[data-l10n-id="albums-tab"]')
    _songs_tab_locator = (By.CSS_SELECTOR, '[data-l10n-id="songs-tab"]')
    _artists_tab_locator = (By.CSS_SELECTOR, '[data-l10n-id="artists-tab"]')
    _title_locator = (By.ID, 'title-text')

    def launch(self):
        Base.launch(self)
        Wait(self.marionette).until(expected.element_not_displayed(
            *self._loading_spinner_locator))

    def wait_for_music_tiles_displayed(self):
        self.marionette.switch_to_frame(self.marionette.find_element(*self._active_view_locator))
        Wait(self.marionette).until(expected.element_displayed(*self._music_tiles_locator))
        self.apps.switch_to_displayed_app()

    def wait_for_empty_message_to_load(self):
        empty_overlay = self.marionette.find_element(*self._empty_overlay_shadow_DOM_locator)
        self.marionette.switch_to_shadow_root(empty_overlay)
        Wait(self.marionette).until(lambda m: self.empty_music_title == 'Add songs to get started')
        Wait(self.marionette).until(lambda m: self.empty_music_text == 'Load songs on to the memory card.')
        self.apps.switch_to_displayed_app()

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
        self.apps.switch_to_displayed_app()
        element = Wait(self.marionette).until(
            expected.element_present(*self._albums_tab_locator))
        Wait(self.marionette).until(expected.element_displayed(element))
        element.tap()
        return ListView(self.marionette, 'albums')

    def tap_songs_tab(self):
        self.apps.switch_to_displayed_app()
        element = Wait(self.marionette).until(
            expected.element_present(*self._songs_tab_locator))
        Wait(self.marionette).until(expected.element_displayed(element))
        element.tap()
        return ListView(self.marionette, 'songs')

    def tap_artists_tab(self):
        self.apps.switch_to_displayed_app()
        element = Wait(self.marionette).until(
            expected.element_present(*self._artists_tab_locator))
        Wait(self.marionette).until(expected.element_displayed(element))
        element.tap()
        return ListView(self.marionette, 'artists')

    def a11y_click_albums_tab(self):
        self.apps.switch_to_displayed_app()
        element = Wait(self.marionette).until(
            expected.element_present(*self._albums_tab_locator))
        Wait(self.marionette).until(expected.element_displayed(element))
        self.accessibility.click(element)
        return ListView(self.marionette, 'albums')

