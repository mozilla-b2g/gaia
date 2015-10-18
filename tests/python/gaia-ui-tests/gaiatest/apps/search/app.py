# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest.apps.base import Base
from marionette_driver import expected, By, Wait
from gaiatest.apps.search.regions.browser import Browser


class Search(Base):

    name = 'Browser'

    _history_item_locator = (By.CSS_SELECTOR, '#history .result')
    _private_window_locator = (By.ID, 'private-window')

    def launch(self):
        Base.launch(self)
        self.set_root_element()

    def set_root_element(self):
        self.root_element = Browser(self.marionette)._root_element

    def go_to_url(self, url):
        return Browser(self.marionette).go_to_url(url)

    @property
    def history_items_count(self):
        Browser(self.marionette).switch_to_content()
        return len(self.marionette.find_elements(*self._history_item_locator))

    def wait_for_history_to_load(self, number_of_items=1):
        Browser(self.marionette).switch_to_content()
        Wait(self.marionette).until(
            lambda m: len(self.marionette.find_elements(*self._history_item_locator)) == number_of_items)

    def open_new_private_window(self):
        Browser(self.marionette).switch_to_content()
        element = self.marionette.find_element(*self._private_window_locator)
        Wait(self.marionette).until(expected.element_displayed(element))
        element.tap()

        from gaiatest.apps.search.regions.browser import PrivateWindow
        return PrivateWindow(self.marionette)
