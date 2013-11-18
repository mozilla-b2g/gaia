# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.base import Base


class VideoPlayer(Base):

    name = 'Video'

    _progress_bar_locator = (By.ID, 'throbber')

    # Video list/summary view
    _video_items_locator = (By.CSS_SELECTOR, '#thumbnails > li')
    _video_name_locator = (By.CSS_SELECTOR, 'div.details')

    _empty_video_title_locator = (By.ID, 'overlay-title')
    _empty_video_text_locator = (By.ID, 'overlay-text')

    def launch(self):
        Base.launch(self)

    def wait_for_progress_bar_complete(self):
        self.wait_for_element_displayed(*self._progress_bar_locator)
        self.wait_for_element_not_displayed(*self._progress_bar_locator)

    def wait_for_progress_bar_not_visible(self):
        self.wait_for_element_not_displayed(*self._progress_bar_locator)

    @property
    def total_video_count(self):
        return len(self.marionette.find_elements(*self._video_items_locator))

    @property
    def first_video_name(self):
        return self.marionette.find_element(*self._video_name_locator).get_attribute('data-title')

    def tap_first_video_item(self):
        first_video_item = self.marionette.find_elements(*self._video_items_locator)[0]
        first_video_item.tap()
        from gaiatest.apps.videoplayer.regions.fullscreen_video import FullscreenVideo
        fullscreen = FullscreenVideo(self.marionette)
        fullscreen.wait_for_player_frame_displayed()
        return fullscreen

    @property
    def empty_video_title(self):
        return self.marionette.find_element(*self._empty_video_title_locator).text

    @property
    def empty_video_text(self):
        return self.marionette.find_element(*self._empty_video_text_locator).text
