# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.base import Base


class UserMediaPage(Base):    
    _audio_button_locator = (By.CSS_SELECTOR, 'button[data-type="startAudioButton"]')

    _frame_locator = (By.CSS_SELECTOR, "#test-iframe[src*='getusermedia']")

    def switch_to_frame(self):
        self.wait_for_element_displayed(*self._frame_locator)
        get_user_media_frame = self.marionette.find_element(*self._frame_locator)
        self.marionette.switch_to_frame(get_user_media_frame)

    def tap_audio1_button(self):
        self.wait_for_element_displayed(*self._audio_button_locator)
        self.marionette.find_element(*self._audio_button_locator).tap()
