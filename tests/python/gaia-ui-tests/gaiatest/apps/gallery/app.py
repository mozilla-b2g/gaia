# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.base import Base

import gaiatest.apps.camera.app


class Gallery(Base):

    name = 'Gallery'

    _gallery_items_locator = (By.CSS_SELECTOR, 'li.thumbnail')
    _empty_gallery_title_locator = (By.ID, 'overlay-title')
    _empty_gallery_text_locator = (By.ID, 'overlay-text')
    _progress_bar_locator = (By.ID, 'progress')
    _thumbnail_list_view_locator = (By.ID, 'thumbnail-list-view')
    _switch_to_camera_button_locator = (By.ID, 'thumbnails-camera-button')

    def launch(self):
        Base.launch(self)
        self.wait_for_element_not_displayed(*self._progress_bar_locator)
        self.wait_for_element_displayed(*self._thumbnail_list_view_locator)

    def wait_for_files_to_load(self, files_number):
        self.wait_for_condition(lambda m: m.execute_script('return window.wrappedJSObject.files.length') >= files_number)

    @property
    def gallery_items_number(self):
        return len(self.marionette.find_elements(*self._gallery_items_locator))

    def tap_first_gallery_item(self):
        first_gallery_item = self.marionette.find_elements(*self._gallery_items_locator)[0]
        first_gallery_item.tap()
        from gaiatest.apps.gallery.regions.fullscreen_image import FullscreenImage
        return FullscreenImage(self.marionette)

    @property
    def empty_gallery_title(self):
        return self.marionette.find_element(*self._empty_gallery_title_locator).text

    @property
    def empty_gallery_text(self):
        return self.marionette.find_element(*self._empty_gallery_text_locator).text

    @property
    def are_gallery_items_displayed(self):
        return self.marionette.find_element(*self._gallery_items_locator).is_displayed()

    def switch_to_camera(self):
        switch_to_camera_button = self.marionette.find_element(*self._switch_to_camera_button_locator)
        #self.marionette.tap(switch_to_camera_button)
        switch_to_camera_button.tap()
        camera_app = gaiatest.apps.camera.app.Camera(self.marionette)
        camera_app.launch()
        return camera_app
