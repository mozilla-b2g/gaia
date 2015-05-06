# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base


class ContextMenu(Base):

    _actions_menu_locator = (By.ID, 'contextmenu-dialog')
    _add_collection_button_locator = (By.ID, 'create-smart-collection')
    _change_wallpaper_button_locator = (By.ID, 'change-wallpaper-action')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        Wait(self.marionette).until(expected.element_displayed(
            Wait(self.marionette).until(expected.element_present(
                *self._actions_menu_locator))))

    def tap_add_collection(self):
        add_collection = Wait(self.marionette).until(
            expected.element_present(*self._add_collection_button_locator))
        Wait(self.marionette).until(expected.element_displayed(add_collection))
        add_collection.tap()

        from gaiatest.apps.homescreen.regions.collections_activity import CollectionsActivity
        return CollectionsActivity(self.marionette)

    def tap_change_wallpaper(self):
        change_wallpaper = Wait(self.marionette).until(
            expected.element_present(*self._change_wallpaper_button_locator))
        Wait(self.marionette).until(expected.element_displayed(change_wallpaper))
        change_wallpaper.tap()

        from gaiatest.apps.system.regions.activities import Activities
        return Activities(self.marionette)
