# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.base import PageRegion


class PasscodePad(PageRegion):

    _numeric_button_locator = (By.CSS_SELECTOR, 'a[data-key="%s"]')
    _emergency_button_locator = (By.CSS_SELECTOR, 'a[data-key="e"]')

    def type_passcode(self, passcode):
        for digit in passcode:
            button_locator = (self._numeric_button_locator[0],
                              self._numeric_button_locator[1] % digit)
            self.root_element.find_element(*button_locator).tap()

    def tap_emergency_call(self):
        self.root_element.find_element(*self._emergency_button_locator).tap()

        from gaiatest.apps.system.regions.emergency_call import EmergencyCallScreen
        emergency_screen = EmergencyCallScreen(self.marionette)
        emergency_screen.switch_to_emergency_call_screen()

        return emergency_screen
