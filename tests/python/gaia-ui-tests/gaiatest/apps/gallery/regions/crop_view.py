# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base


class CropView(Base):
    _src = 'app://gallery.gaiamobile.org/index.html#pick'

    _crop_done_button_locator = (By.ID, 'crop-done-button')
    _edit_preview_canvas_locator = (By.ID, 'edit-preview-canvas')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        Wait(self.marionette).until(expected.element_displayed(
            Wait(self.marionette).until(expected.element_present(
                *self._edit_preview_canvas_locator))))
        # I have tried waiting for all the elements in the UI, but the crash
        # still occurs so the only solution I found was the hardcoded sleep - Bug 1111981
        time.sleep(3)
        done = self.marionette.find_element(*self._crop_done_button_locator)
        Wait(self.marionette).until(expected.element_enabled(done))

    def tap_crop_done(self):
        element = self.marionette.find_element(*self._crop_done_button_locator)
        self.tap_element_from_system_app(element)

        # Fall back to the app underneath
        Wait(self.marionette).until(lambda m: self.apps.displayed_app.src != self._src)
        self.apps.switch_to_displayed_app()
