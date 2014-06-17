# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.base import Base
from gaiatest.apps.system.regions.activities import Activities


class Display(Base):

    _wallpaper_preview_locator = (By.CSS_SELECTOR, '.wallpaper-preview')
    _wallpaper_pick_locator = (By.CSS_SELECTOR, '.wallpaper')
    _stock_wallpapers_locator = (By.CSS_SELECTOR, "div[class='wallpaper']")
    _wallpaper_frame_locator = (By.CSS_SELECTOR, "iframe[src^='app://wallpaper'][src$='pick.html']")

    @property
    def wallpaper_preview_src(self):
        self.wait_for_element_displayed(*self._wallpaper_preview_locator)
        return self.marionette.find_element(*self._wallpaper_preview_locator).get_attribute('src')

    def pick_wallpaper(self):
        self.marionette.find_element(*self._wallpaper_pick_locator).tap()
        return Activities(self.marionette)
