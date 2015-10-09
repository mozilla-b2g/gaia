# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base
from gaiatest.apps.system.regions.activities import Activities

class HomescreenSettings(Base):

    _page_locator = (By.ID, 'homescreens')
    _change_homescreen_page_locator = (By.ID, 'homescreens-list')
    _change_homescreen_locator = (By.CSS_SELECTOR, '[data-l10n-id="change-home-screen"]')
    _get_more_homescreen_locator = (By.CSS_SELECTOR, '[data-l10n-id="get-more-home-screens"]')

    _wallpaper_preview_locator = (By.CSS_SELECTOR, '.wallpaper-preview')
    _wallpaper_pick_locator = (By.CLASS_NAME, 'wallpaper-button')
    _pick_cancel_button_locator = (By.CSS_SELECTOR, '#action-menu-list > '
                                                   '.last-button-container > '
                                                   'button[data-l10n-id="cancel"]')

    @property
    def screen_element(self):
        return self.marionette.find_element(*self._page_locator)

    @property
    def change_homescreen_screen_element(self):
        return self.marionette.find_element(*self._change_homescreen_page_locator)

    def open_change_home_screen(self):
        element = Wait(self.marionette).until(
            expected.element_present(*self._change_homescreen_locator))
        Wait(self.marionette).until(expected.element_displayed(element))
        element.tap()
        new_page = self.marionette.find_element(*self._change_homescreen_page_locator)
        Wait(self.marionette).until(lambda m: new_page.rect['x'] == 0 and new_page.is_displayed())

    def open_get_more_home_screen(self):
        element = Wait(self.marionette).until(
            expected.element_present(*self._get_more_homescreen_locator))
        Wait(self.marionette).until(expected.element_displayed(element))
        element.tap()
        self.marionette.switch_to_frame()
        Wait(self.marionette).until(expected.element_displayed(*self._pick_cancel_button_locator))

    def cancel_get_more_home_screen(self):
        self.marionette.find_element(*self._pick_cancel_button_locator).tap()
        Wait(self.marionette).until(expected.element_not_displayed(*self._pick_cancel_button_locator))
        self.apps.switch_to_displayed_app()
        element = Wait(self.marionette).until(
            expected.element_present(*self._change_homescreen_page_locator))
        Wait(self.marionette).until(expected.element_displayed(element))

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
        self.marionette.find_element(*self._pick_cancel_button_locator).tap()
        Wait(self.marionette).until(expected.element_not_displayed(*self._pick_cancel_button_locator))
        self.apps.switch_to_displayed_app()
        element = Wait(self.marionette).until(
            expected.element_present(*self._wallpaper_preview_locator))
        Wait(self.marionette).until(expected.element_displayed(element))
