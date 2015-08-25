# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import By, Wait
from gaiatest.apps.base import PageRegion


class CellDataPrompt(PageRegion):

    _root_element_locator = (By.CSS_SELECTOR, '#settings-confirm-dialog')
    _turn_on_button_locator = (By.CSS_SELECTOR, 'button[data-l10n-id="turnOn"]')

    def __init__(self, marionette):
        element = marionette.find_element(*self._root_element_locator)
        PageRegion.__init__(self, marionette, element)
        Wait(marionette).until(lambda m: 'current' in element.get_attribute('class'))

    def turn_on(self):
        self.root_element.find_element(*self._turn_on_button_locator).tap()
        Wait(self.marionette).until(lambda m: self.root_element.location['x'] == self.root_element.size['width'])
