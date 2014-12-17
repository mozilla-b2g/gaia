# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette import expected
from marionette import Wait
from marionette.by import By
from marionette.errors import FrameSendFailureError
from gaiatest.apps.base import Base


class CropView(Base):
    _src = 'app://gallery.gaiamobile.org/index.html#pick'

    _crop_view_locator = (By.ID, 'crop-view')
    _crop_done_button_locator = (By.ID, 'crop-done-button')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        Wait(self.marionette).until(expected.element_displayed(
            Wait(self.marionette).until(expected.element_present(
                *self._crop_view_locator))))
        done = self.marionette.find_element(*self._crop_done_button_locator)
        Wait(self.marionette).until(expected.element_enabled(done))

    def tap_crop_done(self):
        try:
            self.marionette.find_element(*self._crop_done_button_locator).tap()
        except FrameSendFailureError:
            # The frame may close for Marionette but that's expected so we can continue - Bug 1065933
            pass

        # Fall back to the app underneath
        Wait(self.marionette).until(lambda m: self.apps.displayed_app.src != self._src)
        self.apps.switch_to_displayed_app()
