# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait
from marionette_driver.marionette import Actions

from gaiatest.apps.base import Base
from gaiatest.apps.base import PageRegion
from gaiatest.apps.homescreen.regions.bookmark_menu import BookmarkMenu


class Collection(Base):

    name = 'Smart Collections'

    _apps_locator = (By.CSS_SELECTOR, 'gaia-grid .icon:not(.placeholder)')
    _close_button_locator = (By.ID, 'close')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        Wait(self.marionette).until(lambda m: self.apps.displayed_app.name == self.name)
        self.apps.switch_to_displayed_app()
        # See Bug 1162112, Marionette Wait() polling without interval might be interfering network load
        Wait(self.marionette, timeout=30, interval=5).until(expected.elements_present(*self._apps_locator))

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
            Wait(self.marionette).until(lambda m: self.apps.displayed_app.name == app_name)
            self.apps.switch_to_displayed_app()

            # Wait for title to load (we cannot be more specific because the aut may change)
            Wait(self.marionette).until(lambda m: m.title)

        def long_tap_to_install(self):
            Actions(self.marionette).long_press(self.root_element, 2).perform()

        def tap_save_to_home_screen(self):
            element = Wait(self.marionette).until(expected.element_present(
                *self._modal_dialog_save_locator))
            Wait(self.marionette).until(expected.element_displayed(element))
            element.tap()
            return BookmarkMenu(self.marionette)
