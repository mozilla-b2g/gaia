# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

try:
    from marionette import (expected,
                            Wait)
    from marionette.by import By
    from marionette.marionette import Actions
except:
    from marionette_driver import (expected,
                                   Wait)
    from marionette_driver.by import By
    from marionette_driver.marionette import Actions

from gaiatest.apps.base import Base


class FullscreenImage(Base):
    '''
    This is not the actual image file - it is a blob of the image file in storage
    '''
    _fullscreen_view_locator = (By.ID, 'fullscreen-view')
    _current_image_locator = (By.CSS_SELECTOR, '#frames .current > .image-view')
    _current_frame_locator = (By.CSS_SELECTOR, '#frames .current')
    _photos_toolbar_locator = (By.ID, 'fullscreen-toolbar')
    _delete_image_locator = (By.ID, 'fullscreen-delete-button-tiny')
    _confirm_delete_locator = (By.ID, 'confirm-ok')
    _edit_photo_locator = (By.ID, 'fullscreen-edit-button-tiny')
    _tile_view_locator = (By.ID, 'fullscreen-back-button-tiny')
    _camera_locator = (By.ID, 'fullscreen-camera-button-tiny')
    _photo_toolbar_options_locator = (By.CSS_SELECTOR, '#fullscreen-toolbar > a')

    # for camera app switch
    _loading_screen_locator = (By.CSS_SELECTOR, '.loading-screen')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        Wait(self.marionette).until(expected.element_displayed(
            Wait(self.marionette).until(expected.element_present(
                *self._current_image_locator))))

    @property
    def is_photo_toolbar_displayed(self):
        return self.marionette.find_element(*self._photos_toolbar_locator).is_displayed()

    @property
    def current_image_source(self):
        return self.marionette.find_element(*self._current_image_locator).value_of_css_property('background-image')

    @property
    def current_image_size_width(self):
        return self.marionette.find_element(*self._current_image_locator).size['width']

    @property
    def current_image_size_height(self):
        return self.marionette.find_element(*self._current_image_locator).size['height']

    @property
    def current_image_frame(self):
        return self.marionette.find_element(*self._current_frame_locator)

    def flick_to_next_image(self):
        self._flick_to_image('next')

    def flick_to_previous_image(self):
        self._flick_to_image('previous')

    def _flick_to_image(self, direction):
        image = self.marionette.find_element(*self._current_image_locator)
        action = Actions(self.marionette)
        x_start = (image.size['width'] / 100) * (direction == 'next' and 90 or 10)
        x_end = (image.size['width'] / 100) * (direction == 'next' and 10 or 90)
        y_start = image.size['height'] / 4
        y_end = image.size['height'] / 4
        action.flick(image, x_start, y_start, x_end, y_end, 200).perform()
        Wait(self.marionette).until(
            lambda m: abs(image.location['x']) >= image.size['width'])

    def tap_delete_button(self):
        self.marionette.find_element(*self._delete_image_locator).tap()
        Wait(self.marionette).until(expected.element_displayed(
            Wait(self.marionette).until(expected.element_present(
                *self._confirm_delete_locator))))

    def tap_confirm_deletion_button(self):
        element = self.marionette.find_element(*self._confirm_delete_locator)
        element.tap()
        Wait(self.marionette).until(expected.element_not_displayed(element))

    def tap_edit_button(self):
        self.marionette.find_element(*self._edit_photo_locator).tap()
        from gaiatest.apps.gallery.regions.edit_photo import EditPhoto
        return EditPhoto(self.marionette)

    def tap_tile_view_button(self):
        fullscreen = self.marionette.find_element(*self._fullscreen_view_locator)
        self.marionette.find_element(*self._tile_view_locator).tap()
        Wait(self.marionette).until(expected.element_not_displayed(fullscreen))
        from gaiatest.apps.gallery.app import Gallery
        return Gallery(self.marionette)

    def tap_switch_to_camera(self):
        self.marionette.find_element(*self._camera_locator).tap()
        from gaiatest.apps.camera.app import Camera
        camera_app = Camera(self.marionette)
        Wait(self.marionette).until(lambda m: self.apps.displayed_app.name == camera_app.name)
        self.apps.switch_to_displayed_app()
        camera_app.wait_for_capture_ready()
        self.wait_for_element_not_displayed(*self._loading_screen_locator)
        return camera_app

    def double_tap_image(self):
        image = self.marionette.find_element(*self._current_image_locator)
        action = Actions(self.marionette)
        action.double_tap(image)
        action.perform()

    @property
    def photo_toolbar_width(self):
        return self.marionette.execute_script('return document.getElementById("fullscreen-toolbar").offsetWidth')

    @property
    def photo_toolbar_options(self):
        return self.marionette.find_elements(*self._photo_toolbar_options_locator)
