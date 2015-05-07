# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time

from marionette_driver import expected, By, Wait
from marionette_driver.errors import NoSuchWindowException

from gaiatest.apps.base import Base


class CropView(Base):
    _src = 'app://gallery.gaiamobile.org/index.html#pick'

    _crop_done_button_locator = (By.ID, 'crop-done-button')
    _edit_preview_canvas_locator = (By.ID, 'edit-preview-canvas')
    _screen_locator = (By.ID, 'screen')

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
        # Workaround for bug 1161088, where tapping on the button inside the app itself
        # makes Marionette spew out NS_ERROR_NOT_INITIALIZED errors
        element = self.marionette.find_element(*self._crop_done_button_locator)
        x = element.rect['x'] + element.rect['width']//2
        y = element.rect['y'] + element.rect['height']//2
        self.marionette.switch_to_frame()
        self.marionette.find_element(*self._screen_locator).tap(x=x, y=y)

        # Fall back to the app underneath
        Wait(self.marionette).until(lambda m: self.apps.displayed_app.src != self._src)
        self.apps.switch_to_displayed_app()
