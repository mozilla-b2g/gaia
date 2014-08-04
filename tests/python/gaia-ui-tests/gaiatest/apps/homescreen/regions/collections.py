# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from marionette.marionette import Actions

from gaiatest.apps.base import Base
from gaiatest.apps.base import PageRegion
from gaiatest.apps.homescreen.regions.bookmark_menu import BookmarkMenu


class Collection(Base):

    name = 'Smart Collections'

    _apps_locator = (By.CSS_SELECTOR, 'gaia-grid .icon:not(.placeholder)')
    _close_button_locator = (By.ID, 'close')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        self.wait_for_condition(lambda m: self.apps.displayed_app.name == self.name)
        self.apps.switch_to_displayed_app()
        self.wait_for_condition(lambda m: len(m.find_elements(*self._apps_locator)) > 0)

    @property
    def applications(self):
        return [self.Result(self.marionette, app) for app in self.marionette.find_elements(*self._apps_locator)]

    class Result(PageRegion):

        # Modal dialog locators
        _modal_dialog_save_locator = (By.ID, "bookmark-cloudapp")

        @property
        def name(self):
            return self.root_element.text

        def tap(self):
            app_name = self.name

            self.root_element.tap()
            # Wait for the displayed app to be that we have tapped
            self.wait_for_condition(lambda m: self.apps.displayed_app.name == app_name)
            self.apps.switch_to_displayed_app()

            # Wait for title to load (we cannot be more specific because the aut may change)
            self.wait_for_condition(lambda m: m.title)

        def long_tap_to_install(self):
            Actions(self.marionette).long_press(self.root_element, 2).perform()

        def tap_save_to_home_screen(self):
            self.wait_for_element_displayed(*self._modal_dialog_save_locator)
            self.marionette.find_element(*self._modal_dialog_save_locator).tap()
            return BookmarkMenu(self.marionette)
