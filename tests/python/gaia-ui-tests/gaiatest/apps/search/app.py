# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest.apps.base import Base
from marionette.by import By


class Search(Base):

    name = 'Browser'
    manifest_url = "app://search.gaiamobile.org/manifest.webapp"

    _url_bar_locator = (By.CSS_SELECTOR, 'div.search-app .urlbar .title')

    def launch(self):
        Base.launch(self)
        self.wait_for_condition(lambda m: self.apps.displayed_app.name == self.name)
        self.wait_for_element_displayed(*self._url_bar_locator)

    def go_to_url(self, url):
        self.marionette.find_element(*self._url_bar_locator).tap()

        from gaiatest.apps.homescreen.regions.search_panel import SearchPanel
        search_panel = SearchPanel(self.marionette)
        return search_panel.go_to_url(url)
