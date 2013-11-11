# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.base import Base

class ContextMenu(Base):
    
    
    _actions_menu_locator = (By.ID, 'contextmenu-dialog')
    _cancel_button_locator = (By.ID, 'contextmenu-dialog-cancel-button')
    _collections_button_locator = (By.ID, 'contextmenu-dialog-collections-button')
    _wallpaper_button_locator = (By.ID, 'contextmenu-dialog-wallpaper-button')
    _action_option_locator = (By.CSS_SELECTOR, 'form[data-type="action"] button')
    
    def __init__(self, marionette):
        Base.__init__(self, marionette)
        self.wait_for_element_displayed(*self._actions_menu_locator)
    
    def tap_cancel(self):
        self.wait_for_element_displayed(*self._cancel_button_locator)
        self.marionette.find_element(*self._cancel_button_locator).tap()
        self.marionette.switch_to_frame(self.apps.displayed_app.frame_id)
    
    def tap_collections(self):
        self.wait_for_element_displayed(*self._collections_button_locator)
        self.marionette.find_element(*self._collections_button_locator).tap()
        from gaiatest.apps.homescreen.regions.addcollectionsmenu import AddCollectionsMenu
        return AddCollectionsMenu(self.marionette)

    @property
    def options_count(self):
        return len(self.marionette.find_elements(*self._action_option_locator))
