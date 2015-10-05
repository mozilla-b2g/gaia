# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time
import pdb

from marionette_driver import expected, By, Wait
from marionette_driver.marionette import Actions

from gaiatest.apps.base import Base


class Camera(Base):

    name = 'Camera'

    _secure_camera_frame_locator = (By.CSS_SELECTOR, ".secureAppWindow.active[data-manifest-name='Camera'] iframe")

    # Controls View
    _controls_locator = (By.CSS_SELECTOR, '.controls')
    _switch_button_locator = (By.CSS_SELECTOR, '.test-switch')
    _camera_switch_locator = (By.CSS_SELECTOR, ".mode-switch_bg-icon[data-icon='camera']")
    _video_switch_locator = (By.CSS_SELECTOR, ".mode-switch_bg-icon[data-icon='video']")
    _capture_button_locator = (By.CSS_SELECTOR, '.test-capture')
    _gallery_button_locator = (By.CSS_SELECTOR, '.test-gallery')
    _thumbnail_button_locator = (By.CSS_SELECTOR, 'img.test-thumbnail')

    _video_timer_locator = (By.CSS_SELECTOR, '.recording-timer')

    # HUD View
    _hud_locator = (By.CSS_SELECTOR, '.hud')
    _loading_screen_locator = (By.CSS_SELECTOR, '.loading-screen')
    _toggle_flash_button_locator = (By.CSS_SELECTOR, '.test-flash-button')
    ## These are named equal to current view
    _camera_switch_to_rear_locator = (By.CSS_SELECTOR, '[data-l10n-id="toggle-camera-front-button"]')
    _camera_switch_to_front_locator = (By.CSS_SELECTOR, '[data-l10n-id="toggle-camera-rear-button"]')

    _menu_button_locator = (By.CSS_SELECTOR, '[data-l10n-id="menu-button"]')
    
    _viewfinder_video_locator = (By.CLASS_NAME, 'viewfinder-video')
    
    # Menu
    _hdr_enable_locator = (By.CSS_SELECTOR, '[data-l10n-id="settings-option-hdr"]')
    _self_timer_enable_locator = (By.CSS_SELECTOR, '[data-l10n-id="setting-option-self-timer"]')
    _5_second_timer_locator = (By.CSS_SELECTOR, '[data-key="secs5"]')
    _grid_lines_enable_locator = (By.CSS_SELECTOR, '[data-l10n-id="setting-option-grid"]')
    _close_menu_locator = (By.CSS_SELECTOR, '[data-l10n-id="close-menu-button"]')
    
    # Indicator Icons
    _timer_enabled_locator = (By.CSS_SELECTOR, '[data-l10n-id="self-timer-indicator"]')
    _hdr_enabled_locator = (By.CSS_SELECTOR, '[data-l10n-id="hdr-indicator"]')
    _geolocation_enabled_locator = (By.CSS_SELECTOR, '[data-l10n-id="location-indicator"]')
    _battery_low_indicator = (By.CSS_SELECTOR, '[data-l10n-id="battery-low-indicator"]')
 
    # Timer Animation
    _timer_animation_locator = (By.CSS_SELECTOR, '[data-timer="active"]')
    
    # ConfirmDialog
    _select_button_locator = (By.CSS_SELECTOR, '.test-confirm-select')

    def launch(self):
        Base.launch(self)
        self.wait_for_capture_ready()
        Wait(self.marionette).until(
            expected.element_not_displayed(*self._loading_screen_locator))

    @property
    def camera_mode(self):
        return self.marionette.find_element(*self._controls_locator).get_attribute('data-mode')

    def take_photo(self):
        self.wait_for_capture_ready()

        self.tap_capture()

        # Wait for thumbnail to appear
        self.wait_for_thumbnail_visible()
        Wait(self.marionette).until(
            expected.element_not_displayed(*self._loading_screen_locator))

    def take_photo_with_timer(self):
        # Wait for camera to be ready to take a picture
        controls = self.marionette.find_element(*self._controls_locator)
        Wait(self.marionette, timeout=20).until(
            lambda m: controls.get_attribute('data-enabled') == 'true')
         
        self.tap_capture()
        time.sleep(1)
        # Wait for Timer to animate
        timer_animating = self.marionette.find_element(*self._timer_animation_locator)
        Wait(self.marionette).until(expected.element_enabled(timer_animating))    

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
        capture_button = self.marionette.find_element(*self._capture_button_locator)
        Wait(self.marionette).until(expected.element_enabled(capture_button))
        capture_button.tap()

    def tap_select_button(self):
        select = self.marionette.find_element(*self._select_button_locator)
        Wait(self.marionette).until(expected.element_enabled(select))
        self.tap_element_from_system_app(select)

        # Fall back to app beneath the picker
        self.wait_to_not_be_displayed()
        self.apps.switch_to_displayed_app()

    def tap_switch_source(self):
        switch = self.marionette.find_element(*self._switch_button_locator)
        Wait(self.marionette).until(expected.element_displayed(switch))

        camera = switch.find_element(*self._camera_switch_locator)
        video = switch.find_element(*self._video_switch_locator)

        current_camera_mode = self.camera_mode
        # TODO: Use marionette.tap(_switch_button_locator) to switch camera mode
        Actions(self.marionette).press(camera).move(video).release().perform()

        controls = self.marionette.find_element(*self._controls_locator)
        Wait(self.marionette).until(lambda m: controls.get_attribute('data-enabled') == 'true')

        Wait(self.marionette).until(lambda m: not current_camera_mode == self.camera_mode)
        self.wait_for_capture_ready()

    def tap_switch_to_front_camera(self):
	self.marionette.find_element(*self._camera_switch_to_front_locator).tap()
	switch_to_rear_button = Wait(self.marionette).until(expected.element_present(*self._camera_switch_to_rear_locator))
        Wait(self.marionette).until(expected.element_displayed(switch_to_rear_button))
        
    def tap_switch_to_rear_camera(self):
	self.marionette.find_element(*self._camera_switch_to_rear_locator).tap()
	switch_to_front_button = Wait(self.marionette).until(expected.element_present(*self._camera_switch_to_front_locator))
        Wait(self.marionette).until(expected.element_displayed(switch_to_front_button))
		
    def tap_menu_button(self):
	self.marionette.find_element(*self._menu_button_locator).tap()
	menu_opened = Wait(self.marionette).until(expected.element_present(*self._close_menu_locator))
	Wait(self.marionette).until(expected.element_displayed(menu_opened))
	
    def tap_enable_timer(self):
	self.marionette.find_element(*self._self_timer_enable_locator).tap()
	option_available = Wait(self.marionette).until(expected.element_present(*self._5_second_timer_locator))
	Wait(self.marionette).until(expected.element_displayed(option_available))
	# select 5 seconds, expected to return to viewfinder
	self.marionette.find_element(*self._5_second_timer_locator).tap()
	returned_to_viewfinder = Wait(self.marionette).until(expected.element_present(*self._menu_button_locator))
	Wait(self.marionette).until(expected.element_displayed(returned_to_viewfinder))
	# Make sure Timer icon is active
	timer_enabled = Wait(self.marionette).until(expected.element_present(*self._timer_enabled_locator))
	Wait(self.marionette).until(expected.element_displayed(timer_enabled))
	
    def tap_close_menu(self):
 	self.marionette.find_element(*self._close_menu_locator).tap()
	returned_to_viewfinder = Wait(self.marionette).until(expected.element_present(*self._menu_button_locator))
	Wait(self.marionette).until(expected.element_displayed(returned_to_viewfinder))     
	
	
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
        gallery_app.wait_to_be_displayed()
        self.apps.switch_to_displayed_app()
        return gallery_app

    def wait_for_thumbnail_visible(self):
        Wait(self.marionette).until(expected.element_displayed(*self._thumbnail_button_locator))

    def tap_thumbnail(self):
        self.marionette.find_element(*self._thumbnail_button_locator).tap()

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
    _video_play_button_locator = (By.CLASS_NAME, 'videoPlayerPlayButton')
    _video_pause_button_locator = (By.CLASS_NAME, 'videoPlayerPauseButton')
    _video_progress_bar_locator = (By.CLASS_NAME, 'videoPlayerProgress')
    _options_button_locator = (By.CLASS_NAME, 'preview-option-icon')
    _delete_button_locator = (By.CSS_SELECTOR, 'button[data-l10n-id="delete"]')
    _gallery_button_locator = (By.CSS_SELECTOR, 'button[data-l10n-id="open-gallery"]')
    _confirm_delete_button = (By.ID, 'dialog-yes')
    _option_menu_locator = (By.CLASS_NAME, 'js-menu')
    _not_video_preview_locator = (By.CSS_SELECTOR, '[style="display: none;"]')

    # for Gallery app switch
    _progress_bar_locator = (By.ID, 'progress')
    _thumbnail_list_view_locator = (By.CSS_SELECTOR, '#thumbnail-views > footer.thumbnails-list')

    @property
    def is_image_preview_visible(self):
        return self.is_element_displayed(*self._image_preview_locator)

    @property
    def is_video_play_button_visible(self):
        return self.is_element_displayed(*self._video_play_button_locator)

    @property
    def is_progress_bar_showing(self):
        return self.is_element_displayed(*self._video_progress_bar_locator)

    @property
    def not_video_preview(self):
	return self.is_element_displayed(*self._not_video_preview_locator)

    def wait_for_media_frame(self):
        media_frame = self.marionette.find_element(*self._media_frame_locator)
        screen_height = int(self.marionette.execute_script('return window.screen.height;'))
        Wait(self.marionette).until(lambda m: (media_frame.location['y'] + media_frame.size['height']) == screen_height)

    def tap_video_player_play_button(self):
        self.marionette.find_element(*self._video_play_button_locator).tap()
        Wait(self.marionette).until(lambda m: self.is_progress_bar_showing is True)

    def tap_video_player_pause_button(self):
        self.marionette.find_element(*self._video_pause_button_locator).tap()
        Wait(self.marionette).until(lambda m: self.is_progress_bar_showing is False)

    def tap_options(self):
        self.marionette.find_element(*self._options_button_locator).tap()
        Wait(self.marionette).until(expected.element_displayed(*self._option_menu_locator))

    def tap_picture_preview(self):
        self.marionette.find_element(*self._thumbnail_button_locator).tap()
	Wait(self.marionette).until(lambda m: self.is_image_preview_visible is True)
            
    def delete_file(self):
        self.tap_options()
        self.marionette.find_element(*self._delete_button_locator).tap()
        element = Wait(self.marionette).until(expected.element_present(*self._confirm_delete_button))
        Wait(self.marionette).until(expected.element_displayed(element))
        element.tap()

    def tap_switch_to_gallery(self):
        self.tap_options()
        self.marionette.find_element(*self._gallery_button_locator).tap()
        from gaiatest.apps.gallery.app import Gallery
        gallery_app = Gallery(self.marionette)
        gallery_app.wait_to_be_displayed()
        self.apps.switch_to_displayed_app()
        Wait(self.marionette).until(expected.element_displayed(*self._thumbnail_list_view_locator))

        return gallery_app

    def tap_camera(self):
        self.marionette.find_element(*self._camera_button_locator).tap()
        camera = Camera(self.marionette)
        return camera
