# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette import Wait
from marionette.by import By
from marionette.marionette import Actions
from gaiatest.apps.base import Base


class FullscreenImage(Base):

    _fullscreen_view_locator = (By.ID, 'fullscreen-view')
    _current_image_locator = (By.CSS_SELECTOR, '#frames .current > img.image-view')
    _photos_toolbar_locator = (By.ID, 'fullscreen-toolbar')
    _delete_image_locator = (By.ID, 'fullscreen-delete-button-tiny')
    _confirm_delete_locator = (By.ID, 'confirm-ok')
    _edit_photo_locator = (By.ID, 'fullscreen-edit-button-tiny')
    _tile_view_locator = (By.ID, 'fullscreen-back-button-tiny')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        self.wait_for_element_displayed(*self._current_image_locator)

    @property
    def is_photo_toolbar_displayed(self):
        return self.marionette.find_element(*self._photos_toolbar_locator).is_displayed()

    @property
    def current_image_source(self):
        return self.marionette.find_element(*self._current_image_locator).get_attribute('src')

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
        self.wait_for_element_displayed(*self._confirm_delete_locator)

    def tap_confirm_deletion_button(self):
        self.marionette.find_element(*self._confirm_delete_locator).tap()
        self.wait_for_element_not_displayed(*self._confirm_delete_locator)

    def tap_edit_button(self):
        self.marionette.find_element(*self._edit_photo_locator).tap()
        from gaiatest.apps.gallery.regions.edit_photo import EditPhoto
        return EditPhoto(self.marionette)

    def tap_tile_view_button(self):
        self.marionette.find_element(*self._tile_view_locator).tap()
        self.wait_for_element_not_displayed(*self._fullscreen_view_locator)
        from gaiatest.apps.gallery.app import Gallery
        return Gallery(self.marionette)

    @property
    def photo_toolbar_width(self):
        return self.marionette.execute_script('return document.getElementById("fullscreen-toolbar").offsetWidth')

    @property
    def current_scale(self):
        style = self.marionette.find_element(*self._current_image_locator).get_attribute('style')
        return map(lambda x: float(x), style.split('scale(')[1].split(') ')[0].split(', '))
