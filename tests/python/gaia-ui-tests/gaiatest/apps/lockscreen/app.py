# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from marionette.marionette import Actions
from gaiatest.apps.base import Base
from gaiatest.apps.homescreen.app import Homescreen
from gaiatest.apps.camera.app import Camera


class LockScreen(Base):

    _lockscreen_locator = (By.ID, 'lockscreen')
    _lockscreen_slider_locator = (By.ID, 'lockscreen-icon-container')

    _lockscreen_handle_locator = (By.ID, 'lockscreen-slide-handle')
    _passcode_pad_locator = (By.ID, 'lockscreen-passcode-pad')

    def unlock(self):

        self._slide_to_unlock('homescreen')
        return Homescreen(self.marionette)

    def unlock_to_camera(self):

        self._slide_to_unlock('camera')
        return Camera(self.marionette)

    def _slide_to_unlock(self, destination):

        self.wait_for_element_displayed(*self._lockscreen_handle_locator)

        lockscreen_handle = self.marionette.find_element(*self._lockscreen_handle_locator)
        lockscreen_handle_x_centre = int(lockscreen_handle.size['width'] / 2)
        lockscreen_handle_y_centre = int(lockscreen_handle.size['height'] / 2)

        lockscreen_slider = self.marionette.find_element(*self._lockscreen_slider_locator)
        handle_destination = lockscreen_slider.size['width']
        if destination == 'camera':
            handle_destination *= -1

        # Flick lockscreen handle to the destination
        Actions(self.marionette).flick(
            lockscreen_handle, lockscreen_handle_x_centre, lockscreen_handle_y_centre, handle_destination, 0
        ).perform()

    def wait_for_lockscreen_not_visible(self):
        self.wait_for_condition(lambda m: not self.marionette.find_element(*self._lockscreen_locator).location['x'] == 0, message="Lockscreen still visible after unlock")

    @property
    def passcode_pad(self):
        self.wait_for_element_displayed(*self._passcode_pad_locator)
        passcode_pad = self.marionette.find_element(*self._passcode_pad_locator)
        from gaiatest.apps.lockscreen.regions.passcode_pad import PasscodePad
        return PasscodePad(self.marionette, passcode_pad)
