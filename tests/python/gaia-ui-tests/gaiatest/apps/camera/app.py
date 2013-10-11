# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time
from marionette.by import By
from gaiatest.apps.base import Base
from gaiatest.apps.base import PageRegion
import gaiatest.apps.gallery.app


class Camera(Base):

    name = 'Camera'

    _capture_button_enabled_locator = (By.CSS_SELECTOR, '#capture-button:not([disabled])')
    _capture_button_locator = (By.ID, 'capture-button')
    _filmstrip_image_locator = (By.CSS_SELECTOR, '#filmstrip > img.thumbnail')
    _switch_source_button_locator = (By.ID, 'switch-button')
    _video_capturing_locator = (By.CSS_SELECTOR, 'body.capturing')
    _video_timer_locator = (By.ID, 'video-timer')
    _filmstrip_locator = (By.ID, 'filmstrip')
    _focus_ring_locator = (By.ID, 'focus-ring')
    _body_locator = (By.TAG_NAME, 'body')
    _gallery_button_locator = (By.ID, 'gallery-button')

    # locators for the case when other apps open camera app
    _select_button_locator = (By.ID, 'select-button')
    _camera_frame_locator = (By.CSS_SELECTOR, 'iframe[src*="camera"][src*="/index.html"]')

    def launch(self):
        Base.launch(self)
        self.wait_for_camera_ready()

    def take_photo(self):
        self.tap_capture()

        # Wait for filmstrip to appear
        self.wait_for_filmstrip_visible()

        # Wait for the camera's focus state to 'ready' for the next shot
        self.wait_for_capture_ready()

        # Wait for filmstrip to clear
        self.wait_for_filmstrip_not_visible()

    def record_video(self, duration):
        # Start recording
        self.tap_capture()
        self.wait_for_element_present(*self._video_capturing_locator)
        # Wait for duration
        timer_text = "00:%02d" % duration
        self.wait_for_condition(lambda m: m.find_element(
            *self._video_timer_locator).text == timer_text, timeout=duration + 30)
        # Stop recording
        self.tap_capture()
        self.wait_for_element_not_displayed(*self._video_timer_locator)

    def tap_capture(self):
        self.wait_for_camera_ready()
        self.marionette.find_element(*self._capture_button_locator).tap()

    def tap_select_button(self):
        self.marionette.find_element(*self._select_button_locator).tap()

    def tap_switch_source(self):
        self.marionette.find_element(*self._switch_source_button_locator).tap()
        self.wait_for_capture_ready()

    def tap_to_display_filmstrip(self):
        self.marionette.find_element(*self._body_locator).tap(x=1, y=1)
        self.wait_for_filmstrip_visible()

    def wait_for_select_button_displayed(self):
        self.wait_for_element_displayed(*self._select_button_locator)

    def wait_for_camera_ready(self):
        self.wait_for_element_present(*self._capture_button_enabled_locator)

    def wait_for_filmstrip_visible(self):
        self.wait_for_condition(lambda m: self.is_filmstrip_visible)

    def wait_for_filmstrip_not_visible(self):
        filmstrip = self.marionette.find_element(*self._filmstrip_locator)
        self.wait_for_condition(lambda m: filmstrip.location['y'] == (0 - filmstrip.size['height']))

    def wait_for_capture_ready(self):
        self.wait_for_condition(lambda m: self.marionette.find_element(*self._focus_ring_locator).get_attribute('data-state') is None)

    def wait_for_video_capturing(self):
        self.wait_for_element_present(*self._video_capturing_locator)

    def wait_for_video_timer_not_visible(self):
        self.wait_for_element_not_displayed(*self._video_timer_locator)

    def switch_to_camera_frame(self):
        self.marionette.switch_to_frame()
        self.wait_for_element_present(*self._camera_frame_locator)
        camera_frame = self.marionette.find_element(*self._camera_frame_locator)
        self.marionette.switch_to_frame(camera_frame)
        self.wait_for_camera_ready()

    def switch_to_gallery(self):
        switch_to_gallery_button = self.marionette.find_element(*self._gallery_button_locator)
        switch_to_gallery_button.tap()
        gallery_app = gaiatest.apps.gallery.app.Gallery(self.marionette)
        gallery_app.launch()
        return gallery_app

    @property
    def is_filmstrip_visible(self):
        return self.marionette.find_element(*self._filmstrip_locator).location['y'] == 0

    @property
    def video_timer(self):
        text = self.marionette.find_element(*self._video_timer_locator).text
        return time.strptime(text, '%M:%S')

    @property
    def is_gallery_button_visible(self):
        return self.is_element_displayed(*self._gallery_button_locator)

    @property
    def filmstrip_images(self):
        return [FilmStripImage(self.marionette, image)
                for image in self.marionette.find_elements(*self._filmstrip_image_locator)]


class FilmStripImage(PageRegion):

    def tap(self):
        self.root_element.tap()
        image_preview = ImagePreview(self.marionette)
        self.wait_for_condition(lambda m: image_preview.is_image_preview_visible)
        return image_preview


class ImagePreview(Base):
    _image_preview_locator = (By.CSS_SELECTOR, '#media-frame > img')
    _camera_button_locator = (By.ID, 'camera-button')

    @property
    def is_image_preview_visible(self):
        return self.is_element_displayed(*self._image_preview_locator)

    def tap_camera(self):
        self.marionette.find_element(*self._camera_button_locator).tap()
        camera = Camera(self.marionette)
        camera.wait_for_capture_ready()
        return camera
