# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.base import Base


class GeolocationPage(Base):    
    _submit_button_locator = (By.ID, 'submit')

    _frame_locator = (By.CSS_SELECTOR, "#test-iframe[src*='geolocation']")

    def switch_to_frame(self):
        self.wait_for_element_displayed(*self._frame_locator)
        geolocation_frame = self.marionette.find_element(*self._frame_locator)
        self.marionette.switch_to_frame(geolocation_frame)

    def tap_find_location_button(self):
        self.wait_for_element_displayed(*self._submit_button_locator)
        self.marionette.find_element(*self._submit_button_locator).tap()
