# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.base import Base
from gaiatest.apps.base import PageRegion


class VideoPlayer(Base):

    name = 'Video'

    # Video list/summary view
    _video_items_locator = (By.CSS_SELECTOR, 'li.thumbnail')

    _empty_video_title_locator = (By.ID, 'overlay-title')
    _empty_video_text_locator = (By.ID, 'overlay-text')

    def launch(self):
        Base.launch(self)

    def wait_for_thumbnails_to_load(self, files_number, message=None):
        timeout = (self.marionette.timeout / 1000) + (files_number * 5)
        self.wait_for_condition(lambda m: len(m.find_elements(*self._video_items_locator)) == files_number,
                                timeout=timeout, message=message)

    @property
    def total_video_count(self):
        return len(self.thumbnails)

    @property
    def first_video_name(self):
        return self.thumbnails[0].name

    def tap_first_video_item(self):
        self.thumbnails[0].tap()
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

    @property
    def thumbnails(self):
        return [self.Thumbnail(self.marionette, element)
                for element in self.marionette.find_elements(*self._video_items_locator)]

    class Thumbnail(PageRegion):
        _video_duration_locator = (By.CSS_SELECTOR, 'div.details .duration-text')
        _video_name_locator = (By.CSS_SELECTOR, 'div.details .title')

        def tap(self):
            self.root_element.tap()

        @property
        def name(self):
            return self.marionette.find_element(*self._video_name_locator).text

        @property
        def total_duration_time(self):
            # Convert it to a real time so we can accurately assert
            text = self.root_element.find_element(*self._video_duration_locator).text
            import time
            return time.strptime(text, '%M:%S')
