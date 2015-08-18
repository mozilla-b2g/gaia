# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base


class AppPermission(Base):

    _page_locator = (By.ID, 'appPermissions')
    _permission_detail_locator = (By.ID, 'appPermissions-details')
    _first_item_locator = (By.CSS_SELECTOR, '.app-list > li:nth-child(1) > a:nth-child(1)')
    _geolocation_selector_locator = (By.CSS_SELECTOR, '[data-l10n-id="perm-geolocation"]')
    _geolocation_ok_button_locator = (By.CLASS_NAME, 'value-option-confirm')

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
            self.marionette.find_element(*self._permission_detail_locator)))

    def tap_geolocation_selection(self):
        self.marionette.find_element(*self._geolocation_selector_locator).tap()
        self.marionette.switch_to_frame()
        Wait(self.marionette).until(expected.element_displayed(
            self.marionette.find_element(*self._geolocation_ok_button_locator)))

    def exit_geolocation_selection(self):
        self.marionette.find_element(*self._geolocation_ok_button_locator).tap()
        self.apps.switch_to_displayed_app()
        Wait(self.marionette).until(expected.element_displayed(
            self.marionette.find_element(*self._permission_detail_locator)))
