# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.base import Base


class Display(Base):

    _wallpaper_preview_locator = (By.ID, 'wallpaper-preview')
    _wallpaper_pick_locator = (By.ID, 'wallpaper')
    _wallpaper_button_locator = (By.XPATH, "//*[text()='Wallpaper']")
    _wallpaper_title_locator = (By.CSS_SELECTOR, "h1[data-l10n-id='select-wallpaper']")
    _stock_wallpapers_locator = (By.CSS_SELECTOR, "div[class='wallpaper']")
    _wallpaper_frame_locator = (By.CSS_SELECTOR, "iframe[src^='app://wallpaper'][src$='pick.html']")

    @property
    def wallpaper_preview_src(self):
        self.wait_for_element_displayed(*self._wallpaper_preview_locator)
        return self.marionette.find_element(*self._wallpaper_preview_locator).get_attribute('src')

    def choose_wallpaper(self, wallpaper_index):
        # Send the pick event to system
        self.marionette.find_element(*self._wallpaper_pick_locator).tap()

        # switch to the system app
        self.marionette.switch_to_frame()

        # choose the source as wallpaper app
        self.wait_for_element_displayed(*self._wallpaper_button_locator)
        self.marionette.find_element(*self._wallpaper_button_locator).tap()

        # switch to the wallpaper app
        self.wait_for_element_displayed(*self._wallpaper_frame_locator)
        self.marionette.switch_to_frame(self.marionette.find_element(*self._wallpaper_frame_locator))

        # pick a wallpaper
        self.wait_for_element_displayed(*self._stock_wallpapers_locator)
        stock_wallpapers = self.marionette.find_elements(*self._stock_wallpapers_locator)
        if len(stock_wallpapers) == 0:
            raise Exception('No stock wallpapers found')
        stock_wallpapers[wallpaper_index].tap()

        # switch to the system app
        self.marionette.switch_to_frame()
        self.wait_for_element_not_present(*self._wallpaper_frame_locator)

        # switch to the setting app
        self.marionette.switch_to_frame(self.apps.displayed_app.frame)
