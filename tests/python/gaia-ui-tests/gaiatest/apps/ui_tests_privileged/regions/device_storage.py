# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base


class DeviceStoragePage(Base):

    _get_music_button_locator = (By.ID, "get-music")
    _get_picture_button_locator = (By.ID, "get-pictures")
    _get_sdcard_button_locator = (By.ID, "get-sdcard")
    _get_video_button_locator = (By.ID, "get-videos")

    _frame_locator = (By.CSS_SELECTOR, "#test-iframe[src*='devicestorage']")

    def switch_to_frame(self):
        frame = Wait(self.marionette).until(
            expected.element_present(*self._frame_locator))
        Wait(self.marionette).until(expected.element_displayed(frame))
        self.marionette.switch_to_frame(frame)

    def tap_get_music_button_locator(self):
        element = Wait(self.marionette).until(
            expected.element_present(*self._get_music_button_locator))
        Wait(self.marionette).until(expected.element_displayed(element))
        element.tap()

    def tap_get_pictures_button_locator(self):
        element = Wait(self.marionette).until(
            expected.element_present(*self._get_picture_button_locator))
        Wait(self.marionette).until(expected.element_displayed(element))
        element.tap()

    def tap_get_sdcard_button_locator(self):
        element = Wait(self.marionette).until(
            expected.element_present(*self._get_sdcard_button_locator))
        Wait(self.marionette).until(expected.element_displayed(element))
        element.tap()

    def tap_get_videos_button_locator(self):
        element = Wait(self.marionette).until(
            expected.element_present(*self._get_video_button_locator))
        Wait(self.marionette).until(expected.element_displayed(element))
        element.tap()
