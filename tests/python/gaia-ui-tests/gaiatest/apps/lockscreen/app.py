# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from marionette.marionette import Actions
from gaiatest.apps.base import Base


class LockScreen(Base):

    _lockscreen_locator = (By.ID, 'lockscreen')
    _lockscreen_icon_area_locator = (By.ID, 'lockscreen-icon-container')

    _lockscreen_handle_locator = (By.ID, 'lockscreen-area-handle')
    _unlock_button_locator = (By.ID, 'lockscreen-area-unlock')
    _camera_button_locator = (By.ID, 'lockscreen-area-camera')
    _passcode_pad_locator = (By.ID, 'lockscreen-passcode-pad')

    def swipe_to_unlock(self):

        unlock_handle = self.marionette.find_element(*self._lockscreen_handle_locator)
        unlock_handle_x_centre = int(unlock_handle.size['width'] / 2)
        unlock_handle_y_centre = int(unlock_handle.size['height'] / 2)

        # Get the end position from the demo animation
        lock_screen_icon_area = self.marionette.find_element(*self._lockscreen_icon_area_locator)
        end_animation_position = lock_screen_icon_area.size['height'] - unlock_handle.size['height']

        # Flick from unlock handle to (0, -end_animation_position) over 800ms duration
        Actions(self.marionette).flick(unlock_handle, unlock_handle_x_centre, unlock_handle_y_centre, 0, 0 - end_animation_position).perform()

        # Wait for the svg to animate and handle to disappear
        # TODO add assertion that unlock buttons are visible after bug 813561 is fixed
        self.wait_for_condition(lambda m: not unlock_handle.is_displayed())

    def tap_unlock_button(self):
        self.marionette.find_element(*self._unlock_button_locator).tap()
        # TODO return home screen app here

    def tap_camera_button(self):
        self.marionette.find_element(*self._camera_button_locator).tap()
        self.wait_for_lockscreen_not_visible()

        from gaiatest.apps.camera.app import Camera
        camera = Camera(self.marionette)
        camera.switch_to_camera_frame()

        return camera

    def wait_for_lockscreen_not_visible(self):
        self.wait_for_condition(lambda m: not self.marionette.find_element(*self._lockscreen_locator).location['x'] == 0, message="Lockscreen still visible after unlock")

    def wait_for_lockscreen_handle_visible(self):
        self.wait_for_element_displayed(*self._lockscreen_handle_locator)

    @property
    def passcode_pad(self):
        self.wait_for_element_displayed(*self._passcode_pad_locator)
        passcode_pad = self.marionette.find_element(*self._passcode_pad_locator)
        from gaiatest.apps.lockscreen.regions.passcode_pad import PasscodePad
        return PasscodePad(self.marionette, passcode_pad)
