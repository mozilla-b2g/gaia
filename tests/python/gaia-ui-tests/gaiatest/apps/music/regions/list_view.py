# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base, PageRegion
from gaiatest.apps.music.regions.sublist_view import SublistView
from gaiatest.apps.music.regions.player_view import PlayerView


class ListView(Base):

    _view_locator = (By.ID, 'views')
    _list_item_locator = (By.CSS_SELECTOR, '.list-item')

    def __init__(self, marionette):
        Base.__init__(self, marionette)

        Wait(self.marionette).until(
            lambda m: self.marionette.find_element(*self._view_locator).get_attribute('class') != 'scrolling')

    @property
    def media(self):
        elements = Wait(self.marionette).until(
            expected.elements_present(*self._list_item_locator))
        Wait(self.marionette).until(expected.element_displayed(elements[0]))
        return [Media(self.marionette, element) for element in elements]


class Media(PageRegion):

    _media_link_locator = (By.TAG_NAME, 'a')

    def tap_first_album(self):
        self.marionette.find_element(*self._media_link_locator).tap()
        return SublistView(self.marionette)

    def tap_first_song(self):
        self.marionette.find_element(*self._media_link_locator).tap()
        return PlayerView(self.marionette)

    def tap_first_artist(self):
        self.marionette.find_element(*self._media_link_locator).tap()
        return SublistView(self.marionette)
