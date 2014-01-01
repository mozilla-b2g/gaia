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

    _camera_frame_locator = (By.CSS_SELECTOR, 'iframe[src*="camera"][src*="/index.html"]')
    _body_locator = (By.TAG_NAME, 'body')

    # Controls View
    _controls_locator = (By.CSS_SELECTOR, '.js-controls')
    _controls_enabled_locator = (By.CSS_SELECTOR, '.js-controls:not(.buttons-disabled)')
    _switch_button_locator = (By.CSS_SELECTOR, '.js-switch')
    _capture_button_locator = (By.CSS_SELECTOR, '.js-capture')
    _gallery_button_locator = (By.CSS_SELECTOR, '.js-gallery')
    _cancel_pick_button_locator = (By.CSS_SELECTOR, '.js-cancel-pick')
    _video_timer_locator = (By.CSS_SELECTOR, '.js-video-timer')

    # HUD View
    _hud_locator = (By.CSS_SELECTOR, '.hud')
    _hud_enabled_locator = (By.CSS_SELECTOR, '.hud:not(.buttons-disabled)')
    _toggle_flash_button_locator = (By.CSS_SELECTOR, '.js-toggle-flash')
    _toggle_camera_button_locator = (By.CSS_SELECTOR, '.js-toggle-camera')
    _flash_text_visible_locator = (By.CSS_SELECTOR, '.is-toggling .flash-text')

    # FocusRing View
    _focus_ring_locator = (By.CSS_SELECTOR, '.focus-ring')

    # Filmstrip View
    _filmstrip_locator = (By.ID, 'filmstrip')
    _filmstrip_image_locator = (By.CSS_SELECTOR, '#filmstrip > img.thumbnail')
    _filmstrip_visible_locator = (By.CSS_SELECTOR, 'body:not(.filmstriphidden)')
    _filmstrip_hidden_locator = (By.CSS_SELECTOR, 'body.filmstriphidden')

    # ConfirmDialog
    _select_button_locator = (By.ID, 'select-button')

    def launch(self):
        Base.launch(self)
        self.wait_for_camera_ready()

    def take_photo(self):
        self.tap_capture()

        # Wait for filmstrip to appear
        self.wait_for_filmstrip_visible()

    def record_video(self, duration):
        # Start recording
        self.tap_capture()

        # Wait for Controls View state to indicate that recording is in-progress
        self.wait_for_video_capturing()

        # Wait for duration
        timer_text = "00:%02d" % duration
        self.wait_for_condition(lambda m: m.find_element(
            *self._video_timer_locator).text >= timer_text, timeout=duration + 10)

        # Stop recording
        self.tap_capture()

        # Wait for filmstrip to appear
        self.wait_for_filmstrip_visible()

    def tap_capture(self):
        self.wait_for_camera_ready()
        self.marionette.find_element(*self._capture_button_locator).tap()

    def tap_select_button(self):
        self.marionette.find_element(*self._select_button_locator).tap()

    def tap_switch_source(self):
        self.marionette.find_element(*self._switch_button_locator).tap()
        self.wait_for_capture_ready()

    def tap_toggle_flash_button(self):
        self.marionette.find_element(*self._toggle_flash_button_locator).tap()
        self.wait_for_flash_text_visible()

    def tap_to_display_filmstrip(self):
        self.marionette.find_element(*self._body_locator).tap()
        self.wait_for_filmstrip_visible()

    def wait_for_select_button_displayed(self):
        self.wait_for_element_displayed(*self._select_button_locator)

    def wait_for_camera_ready(self):
        self.wait_for_element_present(*self._controls_enabled_locator)

    def wait_for_filmstrip_visible(self):
        self.wait_for_condition(lambda m: self.is_filmstrip_visible)

    def wait_for_filmstrip_not_visible(self):
        self.wait_for_condition(lambda m: self.is_filmstrip_hidden)

    def wait_for_capture_ready(self):
        self.wait_for_condition(lambda m: self.marionette.find_element(*self._focus_ring_locator).get_attribute('data-state') is None)

    def wait_for_video_capturing(self):
        self.wait_for_condition(lambda m: self.marionette.find_element(*self._controls_locator).get_attribute('data-recording') == 'true')

    def wait_for_video_timer_not_visible(self):
        self.wait_for_element_not_displayed(*self._video_timer_locator)

    def wait_for_flash_text_visible(self):
        self.wait_for_condition(lambda m: self.is_flash_text_visible)

    def switch_to_camera_frame(self):
        self.marionette.switch_to_frame()
        self.wait_for_element_present(*self._camera_frame_locator)
        camera_frame = self.marionette.find_element(*self._camera_frame_locator)
        self.marionette.switch_to_frame(camera_frame)
        self.wait_for_camera_ready()

    def tap_switch_to_gallery(self):
        switch_to_gallery_button = self.marionette.find_element(*self._gallery_button_locator)
        switch_to_gallery_button.tap()
        gallery_app = gaiatest.apps.gallery.app.Gallery(self.marionette)
        self.wait_for_condition(lambda m: self.apps.displayed_app.name == gallery_app.name)
        self.apps.switch_to_displayed_app()
        return gallery_app

    @property
    def is_toggle_flash_button_visible(self):
        return self.is_element_displayed(*self._toggle_flash_button_locator)

    @property
    def is_filmstrip_visible(self):
        return self.is_element_present(*self._filmstrip_visible_locator)

    @property
    def is_filmstrip_hidden(self):
        return self.is_element_present(*self._filmstrip_hidden_locator)

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
                for image in self.marionette.find_elements(*self._filmstrip_thumbnail_locator)]

    @property
    def current_flash_mode(self):
        return self.marionette.find_element(*self._toggle_flash_button_locator).get_attribute('data-mode')

    @property
    def is_flash_text_visible(self):
        return self.is_element_present(*self._flash_text_visible_locator)

class FilmStripImage(PageRegion):

    def tap(self):
        image_preview = ImagePreview(self.marionette)
        self.root_element.tap()
        image_preview.wait_for_media_frame()
        return image_preview


class ImagePreview(Base):

    _media_frame_locator = (By.ID, 'preview')
    _image_preview_locator = (By.CSS_SELECTOR, '#media-frame > img')
    _camera_button_locator = (By.ID, 'camera-button')

    @property
    def is_image_preview_visible(self):
        return self.is_element_displayed(*self._image_preview_locator)

    def wait_for_media_frame(self):
        media_frame = self.marionette.find_element(*self._media_frame_locator)
        scr_height = int(self.marionette.execute_script('return window.screen.height'))
        self.wait_for_condition(lambda m: (media_frame.location['y'] + media_frame.size['height']) == scr_height)

    def tap_camera(self):
        self.marionette.find_element(*self._camera_button_locator).tap()
        camera = Camera(self.marionette)
        return camera
