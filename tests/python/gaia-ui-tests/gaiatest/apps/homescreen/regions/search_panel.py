# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from marionette.marionette import Actions

from gaiatest import GaiaDevice
from gaiatest.apps.base import Base
from gaiatest.apps.base import PageRegion
from gaiatest.apps.homescreen.app import Homescreen


class SearchPanel(Base):

    _evme_container_locator = (By.ID, 'evmeContainer')
    _search_box_locator = (By.CSS_SELECTOR, '#evme-activation-icon input')
    _search_results_from_everything_me_locator = (By.CSS_SELECTOR, '#evmeAppsList li.cloud[data-name]')
    _search_results_installed_app_locator = (By.CSS_SELECTOR, '#evmeAppsList li.installed[data-name]')
    _search_suggestion_locator = (By.CSS_SELECTOR, '#helper li[data-suggestion]')
    _category_item_locator = (By.CSS_SELECTOR, '#shortcuts-items li[data-query]')
    _loading_apps_locator = (By.CSS_SELECTOR, 'div.loading-apps')
    _app_icon_locator = (By.CSS_SELECTOR, 'li.cloud[data-name]')

    def type_into_search_box(self, search_term):
        self.keyboard.send(search_term)
        # Only if the device is online do we need to wait
        if GaiaDevice(self.marionette).is_online:
            self.wait_for_element_displayed(*self._search_suggestion_locator)
            self.wait_for_condition(lambda m: search_term[0].lower() in self.search_suggestion.lower())
        self.keyboard.tap_enter()

    def wait_for_keyboard_visible(self):
        self.wait_for_condition(
            lambda m: 'keyboard-visible' in self.marionette.find_element(*self._evme_container_locator).get_attribute('class'))

    def wait_for_everything_me_results_to_load(self):
        self.wait_for_element_displayed(*self._search_results_from_everything_me_locator)

    def wait_for_categories_to_load(self):
        self.wait_for_element_not_displayed(*self._loading_apps_locator)
        self.wait_for_element_displayed(*self._category_item_locator)

    def wait_for_app_icons_displayed(self):
        self.wait_for_element_displayed(*self._app_icon_locator)

    def wait_for_installed_apps_displayed(self):
        self.wait_for_element_displayed(*self._search_results_installed_app_locator)

    @property
    def results(self):
        return [self.Result(marionette=self.marionette, element=result)
                for result in self.marionette.find_elements(*self._search_results_from_everything_me_locator)]

    @property
    def everything_me_apps_count(self):
        return len(self.results)

    @property
    def search_suggestion(self):
        return self.marionette.find_element(*self._search_suggestion_locator).text

    def tap_category(self, category_name):
        for category in self.categories:
            if category.name.lower() == category_name.lower():
                category.tap()
                break
        else:
            raise Exception('Category with "%s" name is not present' % category_name)

    @property
    def categories_count(self):
        return len(self.marionette.find_elements(*self._category_item_locator))

    @property
    def categories(self):
        return [self.EverythingMeCategory(self.marionette, root_el) for root_el in
                self.marionette.find_elements(*self._category_item_locator)]

    @property
    def installed_apps(self):
        return [self.InstalledApp(self.marionette, root_el) for root_el in
                self.marionette.find_elements(*self._search_results_installed_app_locator)]

    class EverythingMeCategory(PageRegion):

        _category_title_locator = (By.ID, 'search-title')

        @property
        def name(self):
            return self.root_element.get_attribute('data-query')

        def tap(self):
            self.root_element.tap()
            self.wait_for_element_displayed(*self._category_title_locator)

    class Result(PageRegion):

        @property
        def name(self):
            return self.root_element.get_attribute('data-name')

        def tap(self):
            app_name = self.name

            self.root_element.tap()
            # Wait for the displayed app to be that we have tapped
            self.wait_for_condition(lambda m: self.apps.displayed_app.name == app_name)
            self.marionette.switch_to_frame(self.apps.displayed_app.frame)

            # Wait for title to load (we cannot be more specific because the aut may change)
            self.wait_for_condition(lambda m: m.title)

        def tap_to_install(self):
            Actions(self.marionette).long_press(self.root_element, 2).perform()

            self.marionette.switch_to_frame()
            self.wait_for_element_displayed(*self._modal_dialog_ok_locator)
            modal_dialog_message = self.marionette.find_element(*self._modal_dialog_message_locator).text

            app_name = modal_dialog_message[
                modal_dialog_message.find('Add') + 3:
                modal_dialog_message.find('to Home Screen?')
            ].strip()  # TODO remove hack after Bug 845828 lands in V1-train
            self.marionette.find_element(*self._modal_dialog_ok_locator).tap()

            return app_name

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
