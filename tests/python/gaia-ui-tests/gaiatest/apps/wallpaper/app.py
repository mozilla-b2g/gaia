# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.base import Base


class Wallpaper(Base):

    name = "Wallpaper"

    _stock_wallpapers_locator = (By.CLASS_NAME, 'wallpaper')
    _wallpaper_frame_locator = (By.CSS_SELECTOR, "iframe[src^='app://wallpaper'][src$='pick.html']")

    def tap_wallpaper_by_index(self, index):
        self.wait_for_condition(lambda m: len(m.find_elements(*self._stock_wallpapers_locator)) >= index,
            message = '%s Wallpapers not present after timeout' % index)
        self.marionette.find_elements(*self._stock_wallpapers_locator)[index].tap()
        self.marionette.switch_to_frame()
        self.wait_for_element_not_present(*self._wallpaper_frame_locator)
        self.frame_manager.switch_to_top_frame()
