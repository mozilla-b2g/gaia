# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base


class Addons(Base):

    _page_locator = (By.ID, 'addons')
    _first_item_locator = (By.CSS_SELECTOR, '.addon-list > li:nth-child(1) > a:nth-child(1)')
    _affected_apps_locator = (By.CLASS_NAME, 'addon-targets')
    _state_toggle_locator = (By.CSS_SELECTOR, '.addon-details-body > ul:nth-child(1) > li:nth-child(1)')
    _addon_header = (By.CLASS_NAME, 'addon-details-header')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        Wait(self.marionette).until(
            expected.element_displayed(*self._page_locator))

    @property
    def screen_element(self):
        return self.marionette.find_element(*self._page_locator)

    def tap_first_item(self):
        self.marionette.find_element(*self._first_item_locator).tap()
        Wait(self.marionette).until(expected.element_displayed(
            self.marionette.find_element(*self._affected_apps_locator)))
        Wait(self.marionette).until(expected.element_displayed(
            self.marionette.find_element(*self._state_toggle_locator)))

    def toggle_addon_status(self):
        self.marionette.find_element(*self._state_toggle_locator).tap()

    def exit_addon_description(self):
        self.marionette.find_element(*self._addon_header).tap(25,25)
        Wait(self.marionette).until(expected.element_displayed(
            self.marionette.find_element(*self._first_item_locator)))
