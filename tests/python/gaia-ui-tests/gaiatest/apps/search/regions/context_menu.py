# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By

from gaiatest.apps.base import Base


class ContextMenu(Base):

    _actions_menu_locator = (By.CSS_SELECTOR, 'menu.contextmenu-list')
    _save_image_locator = (By.CSS_SELECTOR, 'button[data-id="save-image"]')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        self.marionette.switch_to_frame()
        self.wait_for_element_displayed(*self._actions_menu_locator)

    def tap_save_image(self):
        self.wait_for_element_displayed(*self._save_image_locator)
        self.marionette.find_element(*self._save_image_locator).tap()
