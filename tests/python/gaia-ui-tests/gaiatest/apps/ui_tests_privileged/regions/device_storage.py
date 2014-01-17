# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.base import Base


class DeviceStoragePage(Base):

    _get_music_button_locator = (By.ID, "get-music")
    _get_picture_button_locator = (By.ID, "get-pictures")
    _get_sdcard_button_locator = (By.ID, "get-sdcard")
    _get_video_button_locator = (By.ID, "get-videos")

    _frame_locator = (By.CSS_SELECTOR, "#test-iframe[src*='devicestorage']")

    def switch_to_frame(self):
        self.wait_for_element_displayed(*self._frame_locator)
        device_storage_page_iframe = self.marionette.find_element(*self._frame_locator)
        self.marionette.switch_to_frame(device_storage_page_iframe)

    def tap_get_music_button_locator(self):
        self.wait_for_element_displayed(*self._get_music_button_locator)
        self.marionette.find_element(*self._get_music_button_locator).tap()

    def tap_get_pictures_button_locator(self):
        self.wait_for_element_displayed(*self._get_picture_button_locator)
        self.marionette.find_element(*self._get_picture_button_locator).tap()

    def tap_get_sdcard_button_locator(self):
        self.wait_for_element_displayed(*self._get_sdcard_button_locator)
        self.marionette.find_element(*self._get_sdcard_button_locator).tap()

    def tap_get_videos_button_locator(self):
        self.wait_for_element_displayed(*self._get_video_button_locator)
        self.marionette.find_element(*self._get_video_button_locator).tap()
