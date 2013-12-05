# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from marionette.marionette import Actions

from gaiatest.apps.base import Base
from gaiatest.apps.base import PageRegion


class Collection(Base):

    _apps_locator = (By.CSS_SELECTOR, '.evme-apps ul.cloud li[data-name]')
    _homescreen_status_notification = (By.CSS_SELECTOR, "section[role='status'] > p")
    _close_collection_locator = (By.CSS_SELECTOR, '#collection div.header .close')

    def wait_for_collection_screen_visible(self):
        self.wait_for_element_displayed(*self._apps_locator)

    def tap_exit(self):
        self.marionette.find_element(*self._close_collection_locator).tap()
        self.wait_for_element_not_displayed(*self._close_collection_locator)
        from gaiatest.apps.homescreen.app import Homescreen
        return Homescreen(self.marionette)

    @property
    def notification_message(self):
        self.wait_for_element_displayed(*self._homescreen_status_notification)
        return self.marionette.find_element(*self._homescreen_status_notification).text

    @property
    def applications(self):
        return [self.Result(self.marionette, app) for app in self.marionette.find_elements(*self._apps_locator)]

    class Result(PageRegion):

        # Modal dialog locators
        _modal_dialog_save_locator = (By.CSS_SELECTOR, ".cloud-app-actions.show > menu > button[data-action = 'save']")

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

        def long_tap_to_install(self):
            Actions(self.marionette).long_press(self.root_element, 2).perform()

        def tap_save_to_home_screen(self):
            self.wait_for_element_displayed(*self._modal_dialog_save_locator)
            self.marionette.find_element(*self._modal_dialog_save_locator).tap()
