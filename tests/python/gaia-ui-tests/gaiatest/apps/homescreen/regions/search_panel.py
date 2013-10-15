# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from marionette.keys import Keys
from marionette.marionette import Actions

from gaiatest.apps.base import Base
from gaiatest.apps.base import PageRegion


class SearchPanel(Base):

    _body = (By.CSS_SELECTOR, 'body')
    _search_title_type_locator = (By.CSS_SELECTOR, '#search-title > .type')
    _search_title_query_locator = (By.CSS_SELECTOR, '#search-title > .query')
    _search_results_from_everything_me_locator = (By.CSS_SELECTOR, '#search .evme-apps ul.cloud li[data-name]')
    _search_results_installed_app_locator = (By.CSS_SELECTOR, '#search .evme-apps ul.installed li[data-name]')
    _app_icon_locator = (By.CSS_SELECTOR, 'ul.cloud li[data-name]')

    def type_into_search_box(self, search_term):
        frame = self.marionette.get_active_frame()
        self.keyboard.send(search_term)
        self.keyboard.tap_enter()
        self.marionette.switch_to_frame(frame)

        self.wait_for_condition(lambda m: self.marionette.find_element(*self._search_title_query_locator).text.lower() ==
                                search_term.lower())

    def wait_for_everything_me_loaded(self):
        self.wait_for_condition(
            lambda m: 'evme-loading' not in self.marionette.find_element(*self._body).get_attribute('class'))

    def wait_for_everything_me_results_to_load(self):
        self.wait_for_element_displayed(*self._search_results_from_everything_me_locator)

    def wait_for_type(self, type):
        self.wait_for_condition(lambda m: type.lower() in self.marionette.find_element(*self._search_title_type_locator).text.lower())

    def wait_for_app_icons_displayed(self):
        self.wait_for_element_displayed(*self._app_icon_locator)

    def wait_for_installed_apps_displayed(self):
        self.wait_for_element_displayed(*self._search_results_installed_app_locator)

    @property
    def results(self):
        return [self.Result(marionette=self.marionette, element=result)
                for result in self.marionette.find_elements(*self._search_results_from_everything_me_locator)]

    @property
    def installed_apps(self):
        return [self.InstalledApp(self.marionette, root_el) for root_el in
                self.marionette.find_elements(*self._search_results_installed_app_locator)]

    class Result(PageRegion):

        _app_iframe_locator = (By.CSS_SELECTOR, 'iframe[data-origin-name="%s"]')

        @property
        def name(self):
            return self.root_element.get_attribute('data-name')

        def tap(self):
            _app_iframe_locator = (self._app_iframe_locator[0],
                                   self._app_iframe_locator[1] % self.name)

            self.root_element.tap()
            # Switch to top level frame then look for the app
            # Find the frame and switch to it
            self.marionette.switch_to_frame()
            app_iframe = self.wait_for_element_present(*_app_iframe_locator)
            self.marionette.switch_to_frame(app_iframe)

            # wait for app to launch
            self.wait_for_condition(lambda m: m.title)

    class InstalledApp(PageRegion):

        @property
        def name(self):
            return self.root_element.get_attribute('data-name')

        def tap(self):
            expected_name = self.name
            self.root_element.tap()
            self.wait_for_condition(
                lambda m: self.apps.displayed_app.name.lower() == expected_name.lower())
            self.marionette.switch_to_frame(self.apps.displayed_app.frame)
