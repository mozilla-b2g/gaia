# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
from marionette_driver import expected, By, Wait

from gaiatest import GaiaApps
from gaiatest.apps.base import PageRegion


class BottomBar(PageRegion):
    _bottom_bar_locator = (By.ID, 'bottombar')
    _remove_locator = (By.ID, 'remove')
    _done_locator = (By.ID, 'done')

    def __init__(self, marionette):
        GaiaApps(marionette).switch_to_displayed_app()
        root = Wait(marionette).until(
            expected.element_present(*self._bottom_bar_locator))
        Wait(marionette).until(expected.element_displayed(root))
        
        window_height = marionette.execute_script('return window.wrappedJSObject.innerHeight')
        Wait(marionette).until(lambda m: int(root.rect['y'] + root.size['height']) == window_height)

        PageRegion.__init__(self, marionette, root)

    def tap_remove(self):
        self.root_element.find_element(*self._remove_locator).tap()
        
        from gaiatest.apps.homescreen.regions.confirm_dialog import ConfirmDialog
        return ConfirmDialog(self.marionette)
        
    def tap_exit_edit_mode(self):
        self.apps.switch_to_displayed_app()
        self.root_element = self.marionette.find_element(*self._bottom_bar_locator)
        self.root_element.find_element(*self._done_locator).tap()