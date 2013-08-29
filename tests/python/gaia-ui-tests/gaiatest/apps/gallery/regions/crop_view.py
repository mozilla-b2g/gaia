# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.base import Base


class CropView(Base):

    _crop_view_locator = (By.ID, 'crop-view')
    _crop_done_button_locator = (By.ID, 'crop-done-button')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        self.wait_for_element_displayed(*self._crop_view_locator)

    def tap_crop_done(self):
        self.wait_for_element_displayed(*self._crop_done_button_locator)
        self.marionette.find_element(*self._crop_done_button_locator).tap()
