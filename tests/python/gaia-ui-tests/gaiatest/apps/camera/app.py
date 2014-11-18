# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time

from marionette import expected
from marionette import Wait
from marionette.by import By
from marionette.marionette import Actions
from marionette.errors import FrameSendFailureError

from gaiatest.apps.base import Base


class Camera(Base):

    name = 'Camera'

    _secure_camera_frame_locator = (By.CSS_SELECTOR, ".secureAppWindow.active[data-manifest-name='Camera'] iframe")

    # Controls View
    _controls_locator = (By.CSS_SELECTOR, '.controls')
    _switch_button_locator = (By.CSS_SELECTOR, '.test-switch')
    _capture_button_locator = (By.CSS_SELECTOR, '.test-capture')
    _gallery_button_locator = (By.CSS_SELECTOR, '.test-gallery')
    _thumbnail_button_locator = (By.CSS_SELECTOR, 'img.test-thumbnail')

    _video_timer_locator = (By.CSS_SELECTOR, '.recording-timer')

    # HUD View
    _hud_locator = (By.CSS_SELECTOR, '.hud')
    _loading_screen_locator = (By.CSS_SELECTOR, '.loading-screen')
    _toggle_flash_button_locator = (By.CSS_SELECTOR, '.test-flash-button')

    _viewfinder_video_locator = (By.CLASS_NAME, 'viewfinder-video')

    # ConfirmDialog
    _select_button_locator = (By.CSS_SELECTOR, '.test-confirm-select')

    def launch(self):
        Base.launch(self)
        self.wait_for_capture_ready()
        self.wait_for_element_not_displayed(*self._loading_screen_locator)

    @property
    def camera_mode(self):
        return self.marionette.find_element(*self._controls_locator).get_attribute('data-mode')

    def take_photo(self):
        # Wait for camera to be ready to take a picture
        controls = self.marionette.find_element(*self._controls_locator)
        Wait(self.marionette, timeout=20).until(
            lambda m: controls.get_attribute('data-enabled') == 'true')

        self.tap_capture()

        # Wait for thumbnail to appear
        self.wait_for_thumbnail_visible()

    def record_video(self, duration):
        # Start recording
        self.tap_capture()

        # Wait for Controls View state to indicate that recording is in-progress
        self.wait_for_video_capturing()

        # Wait for duration
        timeout = duration + 10
        timer_text = "00:%02d" % duration
        timer = self.marionette.find_element(*self._video_timer_locator)
        Wait(self.marionette, timeout).until(lambda m: timer.text >= timer_text)

        # Stop recording
        self.tap_capture()

        # Wait for thumbnail to appear
        self.wait_for_thumbnail_visible()

    def tap_capture(self):
        self.marionette.find_element(*self._capture_button_locator).tap()

    def tap_select_button(self):
        select = self.marionette.find_element(*self._select_button_locator)
        Wait(self.marionette).until(expected.element_enabled(select))

        try:
            select.tap()
        except FrameSendFailureError:
            # The frame may close for Marionette but that's expected so we can continue - Bug 1065933
            pass

        # Fall back to app beneath the picker
        Wait(self.marionette).until(lambda m: self.apps.displayed_app.name != self.name)
        self.apps.switch_to_displayed_app()

    def tap_switch_source(self):
        switch = self.marionette.find_element(*self._switch_button_locator)
        Wait(self.marionette).until(expected.element_displayed(switch))

        current_camera_mode = self.camera_mode
        # TODO: Use marionette.tap(_switch_button_locator) to switch camera mode
        Actions(self.marionette).press(switch).move_by_offset(0, 0).release().perform()

        controls = self.marionette.find_element(*self._controls_locator)
        Wait(self.marionette).until(lambda m: controls.get_attribute('data-enabled') == 'true')

        Wait(self.marionette).until(lambda m: not current_camera_mode == self.camera_mode)
        self.wait_for_capture_ready()

    def tap_toggle_flash_button(self):
        initial_flash_mode = self.current_flash_mode
        toggle = self.marionette.find_element(*self._toggle_flash_button_locator)
        Wait(self.marionette).until(expected.element_enabled(toggle))
        toggle.tap()
        Wait(self.marionette).until(lambda m: self.current_flash_mode != initial_flash_mode)

    def wait_for_capture_ready(self):
        viewfinder = Wait(self.marionette).until(expected.element_present(*self._viewfinder_video_locator))
        Wait(self.marionette, timeout=10).until(lambda m: m.execute_script('return arguments[0].readyState;', [viewfinder]) > 0)
        controls = self.marionette.find_element(*self._controls_locator)
        Wait(self.marionette).until(lambda m: controls.get_attribute('data-enabled') == 'true')
        Wait(self.marionette).until(lambda m: controls.is_enabled())

    def wait_for_video_capturing(self):
        controls = self.marionette.find_element(*self._controls_locator)
        Wait(self.marionette).until(lambda m: controls.get_attribute('data-recording') == 'true')

    def switch_to_secure_camera_frame(self):
        # Find and switch to secure camera app frame (AppWindowManager hides it)
        # This is only used when accessing camera in locked phone state
        self.marionette.switch_to_frame()
        secure_camera_frame = self.marionette.find_element(*self._secure_camera_frame_locator)
        self.marionette.switch_to_frame(secure_camera_frame)
        self.wait_for_capture_ready()

    def tap_switch_to_gallery(self):
        switch_to_gallery_button = self.marionette.find_element(*self._gallery_button_locator)
        switch_to_gallery_button.tap()
        from gaiatest.apps.gallery.app import Gallery
        gallery_app = Gallery(self.marionette)
        Wait(self.marionette).until(lambda m: self.apps.displayed_app.name == gallery_app.name)
        self.apps.switch_to_displayed_app()
        return gallery_app

    def wait_for_thumbnail_visible(self):
        thumbnail = Wait(self.marionette).until(expected.element_present(*self._thumbnail_button_locator))
        Wait(self.marionette).until(expected.element_displayed(thumbnail))

    @property
    def is_thumbnail_visible(self):
        return self.is_element_displayed(*self._thumbnail_button_locator)

    @property
    def video_timer(self):
        text = self.marionette.find_element(*self._video_timer_locator).text
        return time.strptime(text, '%M:%S')

    @property
    def is_gallery_button_visible(self):
        return self.is_element_displayed(*self._gallery_button_locator)

    @property
    def current_flash_mode(self):
        return self.marionette.find_element(*self._hud_locator).get_attribute('flash-mode')

    @property
    def current_image_src(self):
        return self.marionette.find_element(*self._thumbnail_button_locator).get_attribute('src')

    def wait_for_picture_to_change(self, image_src):
        Wait(self.marionette).until(lambda m: self.current_image_src != image_src)


class ImagePreview(Base):

    _media_frame_locator = (By.ID, 'preview')
    _image_preview_locator = (By.CSS_SELECTOR, '#media-frame > img')
    _camera_button_locator = (By.ID, 'camera-button')

    @property
    def is_image_preview_visible(self):
        return self.is_element_displayed(*self._image_preview_locator)

    def wait_for_media_frame(self):
        media_frame = self.marionette.find_element(*self._media_frame_locator)
        screen_height = int(self.marionette.execute_script('return window.screen.height;'))
        Wait(self.marionette).until(lambda m: (media_frame.location['y'] + media_frame.size['height']) == screen_height)

    def tap_camera(self):
        self.marionette.find_element(*self._camera_button_locator).tap()
        camera = Camera(self.marionette)
        return camera
