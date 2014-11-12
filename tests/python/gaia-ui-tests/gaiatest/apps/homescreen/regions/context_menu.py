# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette import Wait
from marionette import expected
from marionette.by import By

from gaiatest.apps.base import Base


class ContextMenu(Base):

    _actions_menu_locator = (By.ID, 'contextmenu-dialog')
    _add_collection_button_locator = (By.ID, 'create-smart-collection')
    _change_wallpaper_button_locator = (By.ID, 'change-wallpaper-action')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        self.wait_for_element_displayed(*self._actions_menu_locator)

    def tap_add_collection(self):
        self.wait_for_element_displayed(*self._add_collection_button_locator)
        self.marionette.find_element(*self._add_collection_button_locator).tap()

        from gaiatest.apps.homescreen.regions.collections_activity import CollectionsActivity
        return CollectionsActivity(self.marionette)

    def tap_change_wallpaper(self):
        change_wallpaper_button = self.marionette.find_element(*self._change_wallpaper_button_locator)
        Wait(self.marionette).until(expected.element_displayed(change_wallpaper_button))
        change_wallpaper_button.tap()

        from gaiatest.apps.system.regions.activities import Activities
        return Activities(self.marionette)
