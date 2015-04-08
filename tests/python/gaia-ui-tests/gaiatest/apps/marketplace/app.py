# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait
from marionette_driver.keys import Keys

from gaiatest.apps.base import Base
from gaiatest.apps.base import PageRegion


class Marketplace(Base):

    _loading_fragment_locator = (By.ID, 'splash-overlay')
    _search_locator = (By.ID, 'search-q')
    _filter_locator = (By.ID, 'compat-filter')
    _marketplace_iframe_locator = (By.CSS_SELECTOR, 'iframe[src*="marketplace"]')
    name = 'Marketplace'

    def filter_search_all_apps(self):
        filter_select = Wait(self.marionette).until(
            expected.element_present(*self._filter_locator))
        Wait(self.marionette).until(expected.element_displayed(filter_select))
        filter_select.tap()

        self.select('All Apps', tap_close=False)

        # After the select is gone, go back to the Marketplace app
        self.apps.switch_to_displayed_app()
        iframe = Wait(self.marionette).until(
            expected.element_present(*self._marketplace_iframe_locator))
        Wait(self.marionette).until(expected.element_displayed(iframe))
        self.marionette.switch_to_frame(iframe)

        return SearchResults(self.marionette)

    def search(self, term):
        iframe = Wait(self.marionette).until(
            expected.element_present(*self._marketplace_iframe_locator))
        Wait(self.marionette).until(expected.element_displayed(iframe))
        self.marionette.switch_to_frame(iframe)

        # This sleep seems necessary, otherwise on device we get timeout failure on display search_box sometimes, see bug 1136791
        import time
        time.sleep(10)

        search_box = Wait(self.marionette).until(
            expected.element_present(*self._search_locator))
        Wait(self.marionette).until(expected.element_displayed(search_box))

        # This sleep is necessary, otherwise the search results are not shown on desktop b2g
        import time
        time.sleep(0.5)

        # search for the app
        search_box.send_keys(term)
        search_box.send_keys(Keys.RETURN)
        return SearchResults(self.marionette)

class SearchResults(Base):

    _search_results_loading_locator = (By.CSS_SELECTOR, '.loading')
    _search_result_locator = (By.CSS_SELECTOR, '#search-results li.item')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        self.wait_for_element_not_present(*self._search_results_loading_locator)

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
