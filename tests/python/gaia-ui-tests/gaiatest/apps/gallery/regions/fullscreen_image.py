# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from marionette.marionette import Actions
from gaiatest.apps.base import Base


class FullscreenImage(Base):

    _fullscreen_view_locator = (By.ID, 'fullscreen-view')
    _current_image_locator = (By.CSS_SELECTOR, '#frames > div.frame[style ~= "translateX(0px);"] > img')
    _photos_toolbar_locator = (By.ID, 'fullscreen-toolbar')
    _delete_image_locator = (By.ID, 'fullscreen-delete-button')
    _confirm_delete_locator = (By.CSS_SELECTOR, '.modal-dialog-confirm-ok.confirm')
    _edit_photo_locator = (By.ID, 'fullscreen-edit-button')
    _tile_view_locator = (By.ID, 'fullscreen-back-button')
    _share_button_locator = (By.ID, 'fullscreen-share-button')

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
        action = Actions(self.marionette)

        current_image = self.marionette.find_element(*self._current_image_locator)
        current_image_move_x = current_image.size['width'] / 2
        current_image_mid_x = current_image.size['width'] / 2
        current_image_mid_y = current_image.size['height'] / 2

        if direction == 'next':
            action.flick(current_image, current_image_mid_x, current_image_mid_y, current_image_mid_x - current_image_move_x, current_image_mid_y)
        else:
            action.flick(current_image, current_image_mid_x, current_image_mid_y, current_image_mid_x + current_image_move_x, current_image_mid_y)

        action.perform()
        self.wait_for_element_displayed(*self._current_image_locator)

    def tap_delete_button(self):
        self.marionette.find_element(*self._delete_image_locator).tap()
        self.marionette.switch_to_frame()
        self.wait_for_element_displayed(*self._confirm_delete_locator)

    def tap_confirm_deletion_button(self):
        self.marionette.find_element(*self._confirm_delete_locator).tap()
        self.wait_for_element_not_displayed(*self._confirm_delete_locator)
        from gaiatest.apps.gallery.app import Gallery
        gallery = Gallery(self.marionette)
        self.wait_for_condition(lambda m: self.apps.displayed_app.name == gallery.name)
        self.marionette.switch_to_frame(self.apps.displayed_app.frame)
        return gallery

    def tap_edit_button(self):
        self.marionette.find_element(*self._edit_photo_locator).tap()
        from gaiatest.apps.gallery.regions.edit_photo import EditPhoto
        return EditPhoto(self.marionette)

    def tap_tile_view_button(self):
        self.marionette.find_element(*self._tile_view_locator).tap()
        self.wait_for_element_not_displayed(*self._fullscreen_view_locator)
        from gaiatest.apps.gallery.app import Gallery
        return Gallery(self.marionette)

    def tap_share_button(self):
        self.marionette.find_element(*self._share_button_locator).tap()
        from gaiatest.apps.system.regions.activities import Activities
        return Activities(self.marionette)

    @property
    def photo_toolbar_width(self):
        return self.marionette.execute_script('return document.getElementById("fullscreen-toolbar").offsetWidth')

    @property
    def is_image_displayed(self):
        return self.is_element_displayed(*self._current_image_locator)

    @property
    def current_scale(self):
        style = self.marionette.find_element(*self._current_image_locator).get_attribute('style')
        return style.split('scale(')[1].split(') ')[0]
