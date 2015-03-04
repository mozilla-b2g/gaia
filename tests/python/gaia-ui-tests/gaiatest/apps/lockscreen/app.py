# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
from datetime import datetime

from marionette_driver import expected, By, Wait
from marionette_driver.marionette import Actions

from gaiatest.apps.base import Base
from gaiatest.apps.base import PageRegion
from gaiatest.apps.homescreen.app import Homescreen
from gaiatest.apps.camera.app import Camera
from gaiatest.apps.lockscreen.regions.passcode_pad import PasscodePad


class LockScreen(Base):

    _lockscreen_window_locator = (By.CLASS_NAME, 'lockScreenWindow')

    _lockscreen_locator = (By.ID, 'lockscreen')
    _lockscreen_handle_locator = (By.ID, 'lockscreen-area-slide')
    _lockscreen_passcode_code_locator = (By.ID, 'lockscreen-passcode-code')
    _lockscreen_passcode_pad_locator = (By.ID, 'lockscreen-passcode-pad')

    _unlock_button_locator = (By.ID, 'lockscreen-area-unlock')
    _camera_button_locator = (By.ID, 'lockscreen-area-camera')

    _notification_locator = (By.CSS_SELECTOR, '#notifications-lockscreen-container > div.notification')

    _time_locator = (By.ID, 'lockscreen-clock-time')

    def switch_to_frame(self):
        # XXX: Because we're not in frame yet. LockScreen team now is
        # trying hard to do decoupling & as-iframe at the same time,
        # but iframe now stuck at weird test failures, so the team decide
        # to land decoupling part first, with some dummy functions that
        # can be modified later to fit the implementation.
        #
        # If we finished to make it as an iframe, to this to switch
        # to the real frame:
        #
        #   self.marionette.switch_to_frame(
        #    self.marionette.find_element(*self._lockscreen_frame_locator));
        #
        # But now we're not ready to do that yet.
        self.marionette.switch_to_frame()

    @property
    def time(self):
        # The lockscreen doesn't display AM/PM since 2.0. It's still present behind a hidden span though.
        lockscreen_time = self.marionette.execute_script(
            "return document.getElementById('%s').innerHTML" % self._time_locator[1])
        return lockscreen_time.replace('<span>', '').replace('</span>', '')

    @property
    def time_in_datetime(self):
        return datetime.strptime(self.time, '%I:%M %p')

    def unlock(self):
        self._slide_to_unlock('homescreen')
        return Homescreen(self.marionette)

    def unlock_to_camera(self):
        Wait(self.marionette).until(expected.element_displayed(
            Wait(self.marionette).until(expected.element_present(
                *self._lockscreen_handle_locator))))
        self._slide_to_unlock('camera')
        return Camera(self.marionette)

    def unlock_to_passcode_pad(self):
        Wait(self.marionette).until(expected.element_displayed(
            Wait(self.marionette).until(expected.element_present(
                *self._lockscreen_handle_locator))))
        self._slide_to_unlock('homescreen')
        Wait(self.marionette).until(expected.element_displayed(
            Wait(self.marionette).until(expected.element_present(
                *self._lockscreen_passcode_code_locator))))
        return PasscodePad(self.marionette)

    def _slide_to_unlock(self, destination):

        lockscreen_handle = self.marionette.find_element(*self._lockscreen_handle_locator)
        lockscreen_handle_x_centre = int(lockscreen_handle.size['width'] / 2)
        lockscreen_handle_y_centre = int(lockscreen_handle.size['height'] / 2)

        handle_destination = lockscreen_handle.size['width']
        if destination == 'camera':
            handle_destination *= -1

        # Flick lockscreen handle to the destination
        Actions(self.marionette).flick(
            lockscreen_handle, lockscreen_handle_x_centre, lockscreen_handle_y_centre, handle_destination, 0
        ).perform()

    def wait_for_lockscreen_not_visible(self):
        self.wait_for_element_not_displayed(*self._lockscreen_locator)

    def wait_for_notification(self):
        Wait(self.marionette).until(expected.element_displayed(
            Wait(self.marionette).until(expected.element_present(
                *self._notification_locator))))

    def a11y_click_unlock_button(self):
        self.accessibility.click(self.marionette.find_element(*self._unlock_button_locator))
        return Homescreen(self.marionette)

    def a11y_click_camera_button(self):
        self.accessibility.click(self.marionette.find_element(*self._camera_button_locator))
        return Camera(self.marionette)

    @property
    def notifications(self):
        return [Notification(self.marionette, element)
                for element in self.marionette.find_elements(*self._notification_locator)]


class Notification(PageRegion):
    _body_locator = (By.CSS_SELECTOR, 'div.detail')
    _title_locator = (By.CSS_SELECTOR, 'div.title')

    @property
    def is_visible(self):
        return self.root_element.is_displayed()

    @property
    def content(self):
        return self.root_element.find_element(*self._body_locator).text

    @property
    def title(self):
        return self.root_element.find_element(*self._title_locator).text
