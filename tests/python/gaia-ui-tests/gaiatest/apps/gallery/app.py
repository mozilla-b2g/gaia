# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base
from gaiatest.apps.base import PageRegion

import gaiatest.apps.camera.app


class Gallery(Base):

    name = 'Gallery'

    _gallery_items_locator = (By.CSS_SELECTOR, 'div.thumbnail')
    _overlay_locator = (By.ID, 'overlay')
    _empty_gallery_title_locator = (By.ID, 'overlay-title')
    _empty_gallery_text_locator = (By.ID, 'overlay-text')
    _progress_bar_locator = (By.ID, 'progress')
    _thumbnail_list_view_locator = (By.CSS_SELECTOR, '#thumbnail-views > footer.thumbnails-list')
    _switch_to_camera_button_locator = (By.ID, 'thumbnails-camera-button')
    _switch_to_multiple_selection_view_locator = (By.ID, 'thumbnails-select-button')

    def launch(self, empty=False):
        Base.launch(self)
        if empty:
            self.wait_for_overlay_to_show()
        else:
            self.wait_for_thumbnail_view_to_load()

    def wait_for_thumbnail_view_to_load(self):
        Wait(self.marionette).until(expected.element_displayed(*self._thumbnail_list_view_locator))

    def wait_for_overlay_to_show(self):
        Wait(self.marionette).until(expected.element_displayed(*self._overlay_locator))

    def wait_for_files_to_load(self, files_number):
        Wait(self.marionette).until(lambda m: m.execute_script(
            'return window.wrappedJSObject.files.length;') == files_number)

    def wait_for_thumbnails_to_load(self):
        Wait(self.marionette).until(expected.element_displayed(*self._gallery_items_locator))

    @property
    def gallery_items_number(self):
        return len(self.thumbnails)

    def tap_first_gallery_item(self):
        first_gallery_item = self.thumbnails[0]
        if self.is_element_displayed(*self._thumbnail_list_view_locator):
            from gaiatest.apps.gallery.regions.fullscreen_image import FullscreenImage as NextView
        else:
            from gaiatest.apps.gallery.regions.crop_view import CropView as NextView
        first_gallery_item.tap()
        return NextView(self.marionette)

    @property
    def empty_gallery_title(self):
        return self.marionette.find_element(*self._empty_gallery_title_locator).text

    @property
    def empty_gallery_text(self):
        return self.marionette.find_element(*self._empty_gallery_text_locator).text

    @property
    def are_gallery_items_displayed(self):
        return self.marionette.find_element(*self._gallery_items_locator).is_displayed()

    @property
    def thumbnails(self):
        return [self.Thumbnail(self.marionette, thumbnail, index)
                for index, thumbnail in enumerate(self.marionette.find_elements(*self._gallery_items_locator))]

    def switch_to_camera(self):
        switch_to_camera_button = self.marionette.find_element(*self._switch_to_camera_button_locator)
        switch_to_camera_button.tap()
        camera_app = gaiatest.apps.camera.app.Camera(self.marionette)
        Wait(self.marionette).until(lambda m: self.apps.displayed_app.name == camera_app.name)
        self.apps.switch_to_displayed_app()
        return camera_app

    def switch_to_multiple_selection_view(self):
        self.marionette.find_element(*self._switch_to_multiple_selection_view_locator).tap()
        from gaiatest.apps.gallery.regions.multiple_selection_view import MultipleSelectionView
        return MultipleSelectionView(self.marionette)

    class Thumbnail(PageRegion):

        def __init__(self, marionette, element, index):
            self.root_element = element
            # Save the index of the element so we can match it to the js files object
            self.index = index
            Base.__init__(self, marionette)

        @property
        def absolute_image_size(self):
            '''
            The dimensions of the image on disk, is drawn from the image's metadata
            '''
            return {"height": self.marionette.execute_script('return window.wrappedJSObject.files[%s].metadata.height' % self.index),
                "width": self.marionette.execute_script('return window.wrappedJSObject.files[%s].metadata.width' % self.index)}

        def tap(self):
            self.root_element.tap()
