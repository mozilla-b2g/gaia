# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest.apps.base import Base
from marionette_driver import expected, By, Wait


class Search(Base):

    name = 'Browser'

    _browser_app_locator = (By.CSS_SELECTOR, 'div.browser[transition-state="opened"]')
    _url_bar_locator = (By.CSS_SELECTOR, 'div.search-app .urlbar .title')
    _history_item_locator = (By.CSS_SELECTOR, '#history .result')
    _private_window_locator = (By.ID, 'private-window')

    def go_to_url(self, url):
        # The URL bar shown is actually in the system app not in this Search app.
        # We switch back to the system app, then tap the panel, but this will only
        # work from Search app which embiggens the input bar
        self.marionette.switch_to_frame()
        if self.is_element_present(*self._url_bar_locator):
            self.marionette.find_element(*self._url_bar_locator).tap()
        else:
            self._url_bar_locator = (By.CSS_SELECTOR, '.urlbar .title')
            self._root_element = self.marionette.find_element(*self._browser_app_locator)
            self._root_element.find_element(*self._url_bar_locator).tap()

        from gaiatest.apps.homescreen.regions.search_panel import SearchPanel
        search_panel = SearchPanel(self.marionette)
        return search_panel.go_to_url(url)

    @property
    def history_items_count(self):
        return len(self.marionette.find_elements(*self._history_item_locator))

    def wait_for_history_to_load(self, number_of_items=1):
        Wait(self.marionette).until(lambda m: len(m.find_elements(*self._history_item_locator)) == number_of_items)

    def open_new_private_window(self):
        self.marionette.find_element(*self._private_window_locator).tap()

        from gaiatest.apps.search.regions.browser import PrivateWindow
        private_window = PrivateWindow(self.marionette)
        private_window.wait_for_page_to_load()
        return private_window
