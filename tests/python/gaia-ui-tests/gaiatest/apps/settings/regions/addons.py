# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base
from gaiatest.apps.base import PageRegion
from gaiatest.apps.settings.regions.addon_details import AddonDetails


class Addons(Base):

    _page_locator = (By.ID, 'addons')
    _items_locator = (By.CSS_SELECTOR, '.addon-list .menu-item')

    _details_page_locator = (By.ID, 'addon-details')
    _affected_apps_locator = (By.CLASS_NAME, 'addon-targets')
    _state_toggle_locator = (By.CSS_SELECTOR, '.addon-details-body gaia-switch')

    _addon_header = (By.CLASS_NAME, 'addon-details-header')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        Wait(self.marionette).until(
            expected.element_displayed(*self._page_locator))

    @property
    def screen_element(self):
        return self.marionette.find_element(*self._page_locator)

    @property
    def details_screen_element(self):
        return self.marionette.find_element(*self._details_page_locator)

    @property
    def items(self):
        return [Addon(self.marionette, element)
            for element in self.marionette.find_elements(*self._items_locator)]

    @property
    def is_addon_enabled(self):
        return self.marionette.find_element(*self._state_toggle_locator).is_selected()

    def tap_first_item(self):
        self.items[0].tap()
        Wait(self.marionette).until(expected.element_displayed(
            self.marionette.find_element(*self._affected_apps_locator)))
        Wait(self.marionette).until(expected.element_displayed(
            self.marionette.find_element(*self._state_toggle_locator)))

    def toggle_addon_status(self):
        self.marionette.find_element(*self._state_toggle_locator).tap()


class Addon(PageRegion):

    _name_locator = (By.CSS_SELECTOR, 'span')

    @property
    def name(self):
        return self.root_element.find_element(*self._name_locator).text

    def tap(self):
        self.root_element.tap()
        return AddonDetails(self.marionette)
