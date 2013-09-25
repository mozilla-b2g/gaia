# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time
from marionette.by import By
from gaiatest.apps.base import Base


class FullscreenVideo(Base):

    _video_controls_locator = (By.ID, 'videoControls')
    _video_title_locator = (By.ID, 'video-title')
    _elapsed_text_locator = (By.ID, 'elapsed-text')
    _video_player_locator = (By.ID, 'player')
    _video_frame_locator = (By.CSS_SELECTOR, "iframe[src^='app://video'][src$='view.html']")
    _video_player_frame_locator = (By.ID, 'fullscreen-view')
    _spinner_overlay_locator = (By.ID, 'spinner-overlay')

    def wait_for_player_frame_displayed(self):
        self.wait_for_element_displayed(*self._video_player_frame_locator)

    def display_controls_with_js(self):
        self.marionette.execute_script("window.wrappedJSObject.showVideoControls(true);")
        self.wait_for_element_displayed(*self._video_controls_locator)

    @property
    def elapsed_time(self):
        # Convert it to a real time so we can accurately assert
        text = self.marionette.find_element(*self._elapsed_text_locator).text
        return time.strptime(text, '%M:%S')

    @property
    def name(self):
        return self.marionette.find_element(*self._video_title_locator).text

    @property
    def is_video_playing(self):
        return self.marionette.find_element(*self._video_player_locator).get_attribute('paused') == 'false'

    def switch_to_video_frame(self):
        self.marionette.switch_to_frame(self.marionette.find_element(*self._video_frame_locator))
        self.wait_for_element_not_displayed(*self._spinner_overlay_locator)
