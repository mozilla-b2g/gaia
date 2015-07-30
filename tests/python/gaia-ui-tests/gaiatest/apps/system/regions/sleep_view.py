# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base
from gaiatest.apps.base import PageRegion


class SleepScreen(Base):

    _sleep_menu_locator = (By.ID, "sleep-menu")
    _title_locator = (By.CSS_SELECTOR, "#sleep-menu-container > header > h1")
    _menu_items_locator = (By.CSS_SELECTOR, "#sleep-menu-container > section > ul > li")
    _cancel_button_locator = (By.CSS_SELECTOR, "#sleep-menu-container > gaia-buttons > button")

    @property
    def is_menu_visible(self):
        return self.is_element_displayed(*self._sleep_menu_locator)

    def wait_for_sleep_menu_visible(self):
        Wait(self.marionette).until(expected.element_displayed(*self._sleep_menu_locator))

    @property
    def title(self):
        return self.marionette.find_element(*self._title_locator).text

    def tap_cancel_button(self):
        self.marionette.find_element(*self._cancel_button_locator).tap()

    @property
    def menu_items(self):
        return [self.MenuItem(self.marionette, item)
                for item in self.marionette.find_elements(*self._menu_items_locator)]

    class MenuItem(PageRegion):

        @property
        def name(self):
            return self.root_element.text

        def tap(self):
            self.root_element.tap()
