# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette import Wait
from marionette.by import By
from marionette.errors import StaleElementException
from marionette.errors import NoSuchElementException

from gaiatest.apps.base import Base
from gaiatest.apps.base import PageRegion


class SearchPanel(Base):

    _search_results_app_frame = (By.CSS_SELECTOR, '.searchWindow iframe')
    _app_search_results_locator = (By.CSS_SELECTOR, 'gaia-grid .icon')

    def _switch_to_search_results_frame(self):
        self.marionette.switch_to_frame()
        self.marionette.switch_to_frame(self.marionette.find_element(*self._search_results_app_frame))

    def type_into_search_box(self, search_term):
        self.keyboard.send(search_term)
        # The search results frame is not the displayed app so we must explicitly switch into it
        self._switch_to_search_results_frame()

    def wait_for_everything_me_results_to_load(self):
        self.wait_for_condition(lambda m: m.find_element(*self._app_search_results_locator))

    @property
    def results(self):
        return [self.Result(marionette=self.marionette, element=result)
                for result in self.marionette.find_elements(*self._app_search_results_locator)]

    class Result(PageRegion):

        _title_locator = (By.CSS_SELECTOR, 'span.title')

        @property
        def name(self):
            return self.root_element.find_element(*self._title_locator).text

        def tap(self):
            app_name = self.name

            self.root_element.tap()
            # Wait for the displayed app to be that we have tapped
            self.wait_for_condition(lambda m: self.apps.displayed_app.name == app_name)
            self.apps.switch_to_displayed_app()

            # Wait for title to load (we cannot be more specific because the aut may change)
            self.wait_for_condition(lambda m: bool(m.title))
