# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.base import Base


class Activities(Base):

    _actions_menu_locator = (By.CSS_SELECTOR, 'form[data-type="action"]')
    _action_option_locator = (By.CSS_SELECTOR, 'form[data-type="action"] button')
    _activity_window_locator = (By.CLASS_NAME, 'activityWindow')

    _wallpaper_button_locator = (By.XPATH, "//*[text()='Wallpaper']")
    _gallery_button_locator = (By.XPATH, '//*[text()="Gallery"]')
    _camera_button_locator = (By.XPATH, '//*[text()="Camera"]')
    _cancel_button_locator = (By.CSS_SELECTOR, 'form[data-type="action"] button[data-action="cancel"]')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        self.marionette.switch_to_frame()
        view = self.marionette.find_element(*self._actions_menu_locator)
        if 'contextmenu' in view.get_attribute('class'):
            # final position is below the status bar
            self.wait_for_condition(lambda m: view.location['y'] == 20)
        else:
            self.wait_for_condition(lambda m: view.location['y'] == 0)

    def tap_wallpaper(self):
        self.marionette.find_element(*self._wallpaper_button_locator).tap()
        from gaiatest.apps.wallpaper.app import Wallpaper
        wallpaper = Wallpaper(self.marionette)
        self.frame_manager.wait_for_and_switch_to_top_frame(wallpaper.name.lower())
        return wallpaper

    def tap_gallery(self):
        self.marionette.find_element(*self._gallery_button_locator).tap()
        from gaiatest.apps.gallery.app import Gallery
        gallery = Gallery(self.marionette)
        self.frame_manager.wait_for_and_switch_to_top_frame(gallery.name.lower())
        return gallery

    def tap_camera(self):
        self.marionette.find_element(*self._camera_button_locator).tap()
        from gaiatest.apps.camera.app import Camera
        camera = Camera(self.marionette)
        self.frame_manager.wait_for_and_switch_to_top_frame(camera.name.lower())
        camera.wait_for_capture_ready()
        return camera

    def tap_cancel(self):
        self.marionette.find_element(*self._cancel_button_locator).tap()
        self.frame_manager.switch_to_top_frame()

    @property
    def options_count(self):
        return len(self.marionette.find_elements(*self._action_option_locator))

    @property
    def is_menu_visible(self):
        return self.is_element_displayed(*self._actions_menu_locator)
