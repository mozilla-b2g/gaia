# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from marionette.keys import Keys
from gaiatest.apps.base import Base
from gaiatest.apps.base import PageRegion


class Marketplace(Base):

    _loading_fragment_locator = (By.CSS_SELECTOR, 'div.loading-fragment')

    _search_locator = (By.ID, 'search-q')

    def __init__(self, marionette, app_name=False):
        Base.__init__(self, marionette)
        if app_name:
            self.name = app_name

    def launch(self):
        Base.launch(self, launch_timeout=120000)
        self.wait_for_element_not_displayed(*self._loading_fragment_locator)

    def search(self, term):
        self.wait_for_element_displayed(*self._search_locator)
        search_box = self.marionette.find_element(*self._search_locator)

        # search for the app
        search_box.send_keys(term)

        search_box.send_keys(Keys.RETURN)
        return SearchResults(self.marionette)

class SearchResults(Base):

    _search_results_loading_locator = (By.CSS_SELECTOR, 'div.loading')
    _search_result_locator = (By.CSS_SELECTOR, '#search-results li.item')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        self.wait_for_element_not_present(*self._search_results_loading_locator)

    @property
    def search_results(self):
        self.wait_for_element_displayed(*self._search_result_locator)
        search_results = self.marionette.find_elements(*self._search_result_locator)
        return [Result(self.marionette, result) for result in search_results]

class Result(PageRegion):

    _install_button_locator = (By.CSS_SELECTOR, '.button.product.install')

    def tap_install_button(self):
        self.root_element.find_element(*self._install_button_locator).tap()
        self.marionette.switch_to_frame()
