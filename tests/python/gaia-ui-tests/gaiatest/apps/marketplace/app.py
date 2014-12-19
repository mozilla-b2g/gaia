# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette import expected
from marionette import Wait
from marionette.by import By
from marionette.keys import Keys
from gaiatest.apps.base import Base
from gaiatest.apps.base import PageRegion


class Marketplace(Base):

    _loading_fragment_locator = (By.ID, 'splash-overlay')
    _search_locator = (By.ID, 'search-q')
    _marketplace_iframe_locator = (By.CSS_SELECTOR, 'iframe[src*="marketplace"]')
    name = 'Marketplace'

    def search(self, term):
        iframe = Wait(self.marionette).until(
            expected.element_present(*self._marketplace_iframe_locator))
        Wait(self.marionette).until(expected.element_displayed(iframe))
        self.marionette.switch_to_frame(iframe)

        search_box = Wait(self.marionette).until(
            expected.element_present(*self._search_locator))
        Wait(self.marionette).until(expected.element_displayed(search_box))

        # search for the app
        search_box.send_keys(term)
        search_box.send_keys(Keys.RETURN)
        return SearchResults(self.marionette)

class SearchResults(Base):

    _search_results_loading_locator = (By.CSS_SELECTOR, '.loading')
    _search_result_locator = (By.CSS_SELECTOR, '#search-results li.item')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        Wait(self.marionette).until(
            expected.element_not_present(*self._search_results_loading_locator))

    @property
    def search_results(self):
        results = Wait(self.marionette).until(
            lambda m: m.find_elements(*self._search_result_locator))
        Wait(self.marionette).until(expected.element_displayed(results[0]))
        return [Result(self.marionette, result) for result in results]

class Result(PageRegion):

    _install_button_locator = (By.CSS_SELECTOR, '.button.product.install')
    _name_locator = (By.CSS_SELECTOR, 'h3[itemprop="name"]')

    def tap_install_button(self):
        self.root_element.find_element(*self._install_button_locator).tap()
        self.marionette.switch_to_frame()

    def get_app_name(self):
        return self.root_element.find_element(*self._name_locator).text
