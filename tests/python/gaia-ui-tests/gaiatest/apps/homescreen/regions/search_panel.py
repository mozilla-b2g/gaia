# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from marionette.keys import Keys
from marionette.marionette import Actions

from gaiatest.apps.base import Base
from gaiatest.apps.base import PageRegion


class SearchPanel(Base):

    _search_box_locator = (By.CSS_SELECTOR, '#evme-activation-icon input')
    _search_results_from_everything_me_locator = (By.CSS_SELECTOR, '#evmeAppsList li.cloud[data-name]')
    _search_results_installed_app_locator = (By.CSS_SELECTOR, '#evmeAppsList li.installed[data-name]')
    _category_item_locator = (By.CSS_SELECTOR, '#shortcuts-items li[data-query]')
    _loading_apps_locator = (By.CSS_SELECTOR, 'div.loading-apps')
    _app_icon_locator = (By.CSS_SELECTOR, 'li.cloud[data-name]')

    def type_into_search_box(self, search_term):
        search_box = self.marionette.find_element(*self._search_box_locator)
        search_box.clear()
        search_box.send_keys(search_term)
        search_box.send_keys(Keys.RETURN)

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

        @property
        def name(self):
            return self.root_element.get_attribute('data-query')

        def tap(self):
            self.root_element.tap()

    class Result(PageRegion):

        _app_iframe_locator = (By.CSS_SELECTOR, 'iframe[data-origin-name="%s"]')

        # Modal dialog locators
        _modal_dialog_message_locator = (By.ID, 'modal-dialog-confirm-message')
        _modal_dialog_ok_locator = (By.ID, 'modal-dialog-confirm-ok')

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
