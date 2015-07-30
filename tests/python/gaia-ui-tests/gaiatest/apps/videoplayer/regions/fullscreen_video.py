# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time

from marionette_driver import By, Wait, expected
from marionette_driver.marionette import Actions

from gaiatest.apps.base import Base


class FullscreenVideo(Base):

    _video_controls_header = (By.ID, 'player-header')
    _video_controls_video_bar = (By.ID, 'videoBar')
    _video_controls_video_control_bar = (By.ID, 'videoControlBar')
    _video_title_locator = (By.ID, 'video-title')
    _elapsed_text_locator = (By.ID, 'elapsed-text')
    _video_player_locator = (By.ID, 'player')
    _video_player_frame_locator = (By.ID, 'player-view')
    _video_seek_head_locator = (By.ID, 'playHead')
    _video_rewind_button_locator = (By.ID, 'seek-backward')
    _video_play_button_locator = (By.ID, 'play')
    _video_forward_button_locator = (By.ID, 'seek-forward')

    def wait_for_player_frame_displayed(self):
        Wait(self.marionette).until(expected.element_displayed(*self._video_player_frame_locator))

    def show_controls(self):
        self.marionette.find_element(*self._video_player_locator).tap()
        Wait(self.marionette).until(expected.element_displayed(*self._video_controls_header))
        Wait(self.marionette).until(expected.element_displayed(*self._video_controls_video_bar))
        Wait(self.marionette).until(expected.element_displayed(*self._video_controls_video_control_bar))

    # move the slider
    def move_seek_slider(self, offset):
        scale = self.marionette.find_element(*self._video_seek_head_locator)
        finger = Actions(self.marionette)
        finger.press(scale)
        finger.move_by_offset(offset, 0)
        finger.release()
        finger.perform()

    def tap_rewind(self):
        self.marionette.find_element(*self._video_rewind_button_locator).tap()

    def tap_forward(self):
        self.marionette.find_element(*self._video_forward_button_locator).tap()

    def tap_play(self):
        self.marionette.find_element(*self._video_play_button_locator).tap()

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
