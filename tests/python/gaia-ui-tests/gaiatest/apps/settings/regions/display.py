# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base
from gaiatest.apps.system.regions.activities import Activities


class Display(Base):

    _wallpaper_preview_locator = (By.CSS_SELECTOR, '.wallpaper-preview')
    _wallpaper_pick_locator = (By.CSS_SELECTOR, '.wallpaper')
    _wallpaper_pick_cancel_button_locator = (By.CSS_SELECTOR, '#action-menu-list > button:nth-child(4)')
    _stock_wallpapers_locator = (By.CSS_SELECTOR, "div[class='wallpaper']")
    _wallpaper_frame_locator = (By.CSS_SELECTOR, "iframe[src^='app://wallpaper'][src$='pick.html']")
    _timeout_selector_locator = (By.NAME, "screen.timeout")
    _timeout_confirmation_button_locator = (By.CLASS_NAME, "value-option-confirm")

    @property
    def wallpaper_preview_src(self):
        element = Wait(self.marionette).until(
            expected.element_present(*self._wallpaper_preview_locator))
        Wait(self.marionette).until(expected.element_displayed(element))
        return element.get_attribute('src')

    def pick_wallpaper(self):
        self.marionette.find_element(*self._wallpaper_pick_locator).tap()
        return Activities(self.marionette)

    def cancel_pick_wallpaper(self):
        self.marionette.switch_to_frame()
        self.marionette.find_element(*self._wallpaper_pick_cancel_button_locator).tap()
        self.apps.switch_to_displayed_app()
        element = Wait(self.marionette).until(
            expected.element_present(*self._wallpaper_preview_locator))
        Wait(self.marionette).until(expected.element_displayed(element))

    def tap_timeout_selector(self):
        self.marionette.find_element(*self._timeout_selector_locator).tap()
        self.marionette.switch_to_frame()
        element = Wait(self.marionette).until(
            expected.element_present(*self._timeout_confirmation_button_locator))
        Wait(self.marionette).until(expected.element_displayed(element))

    def tap_timeout_confirmation(self):
        self.marionette.find_element(*self._timeout_confirmation_button_locator).tap()
        self.apps.switch_to_displayed_app()
        element = Wait(self.marionette).until(
            expected.element_present(*self._timeout_selector_locator))
        Wait(self.marionette).until(expected.element_displayed(element))
