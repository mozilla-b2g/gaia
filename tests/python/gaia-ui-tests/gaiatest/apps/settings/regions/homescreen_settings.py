# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base
from gaiatest.apps.system.regions.activities import Activities

class HomescreenSettings(Base):

    _page_locator = (By.ID, 'homescreens')
    _change_icon_layout_locator = (By.CSS_SELECTOR, 'select[name="grid.layout.cols"]')
    _change_icon_choices_locator = (By.CSS_SELECTOR, '.value-selector-options-container > [role="option"]')
    _confirm_layout_button_locator = (By.CSS_SELECTOR, 'button[data-l10n-id="ok"]')

    _change_homescreen_page_locator = (By.ID, 'homescreens-list')
    _change_homescreen_locator = (By.CSS_SELECTOR, '[data-l10n-id="change-home-screen"]')
    _get_more_homescreen_locator = (By.CSS_SELECTOR, '[data-l10n-id="get-more-home-screens"]')
    _pick_homescreen_cancel_button_locator = (By.CSS_SELECTOR, '#action-menu-list button[data-l10n-id="cancel"]')

    _wallpaper_preview_locator = (By.CSS_SELECTOR, '.wallpaper-preview')
    _wallpaper_pick_locator = (By.CLASS_NAME, 'wallpaper-button')
    _wallpaper_pick_cancel_btn_locator = (By.CSS_SELECTOR, '#action-menu-list button[data-l10n-id="cancel"]')

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
        Wait(self.marionette).until(expected.element_displayed(*self._pick_homescreen_cancel_button_locator))

    def cancel_get_more_home_screen(self):
        self.marionette.find_element(*self._pick_homescreen_cancel_button_locator).tap()
        Wait(self.marionette).until(expected.element_not_displayed(*self._pick_homescreen_cancel_button_locator))
        self.apps.switch_to_displayed_app()
        element = Wait(self.marionette).until(
            expected.element_present(*self._change_homescreen_page_locator))
        Wait(self.marionette).until(expected.element_displayed(element))

    def select_change_icon_layout(self):
        element = Wait(self.marionette).until(
            expected.element_present(*self._change_icon_layout_locator))
        Wait(self.marionette).until(expected.element_displayed(element))
        element.tap()
        self.marionette.switch_to_frame()
        Wait(self.marionette).until(expected.element_displayed(*self._confirm_layout_button_locator))

    def pick_icon_layout(self, text):
        self.marionette.switch_to_frame()
        for selection in self.marionette.find_elements(*self._change_icon_choices_locator):
            if selection.text == text:
                selection.tap()

    def confirm_icon_layout(self):
        self.marionette.find_element(*self._confirm_layout_button_locator).tap()
        self.apps.switch_to_displayed_app()
        element = Wait(self.marionette).until(
            expected.element_present(*self._change_icon_layout_locator))
        Wait(self.marionette).until(expected.element_displayed(element))

    def change_icon_layout(self, layout_text):
        self.select_change_icon_layout()
        self.pick_icon_layout(layout_text)
        self.confirm_icon_layout()

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
        self.marionette.find_element(*self._wallpaper_pick_cancel_btn_locator).tap()
        Wait(self.marionette).until(expected.element_not_displayed(*self._wallpaper_pick_cancel_btn_locator))
        self.apps.switch_to_displayed_app()
        element = Wait(self.marionette).until(
            expected.element_present(*self._wallpaper_preview_locator))
        Wait(self.marionette).until(expected.element_displayed(element))
