# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By

from gaiatest.apps.base import Base


class ContextMenu(Base):

    _actions_menu_locator = (By.ID, 'contextmenu-dialog')
    _add_collection_button_locator = (By.ID, 'contextmenu-dialog-collections-button')
    _collection_select_locator = (By.ID, 'collections-select')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        self.wait_for_element_displayed(*self._actions_menu_locator)

    def tap_add_collection(self):
        self.wait_for_element_displayed(*self._add_collection_button_locator)
        self.marionette.find_element(*self._add_collection_button_locator).tap()
        self.wait_for_element_displayed(*self._collection_select_locator)
