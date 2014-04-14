# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.base import Base
from gaiatest.apps.homescreen.app import Homescreen
from gaiatest.apps.emergency_call.app import EmergencyCall

class PasscodePad(Base):

    _lockscreen_panel_locator = (By.ID, 'lockscreen-panel-passcode')
    _numeric_button_locator = (By.CSS_SELECTOR, '#lockscreen-passcode-pad a[data-key="%s"]')
    _emergency_button_locator = (By.CSS_SELECTOR, '#lockscreen-passcode-pad a[data-key="e"]')

    def __init__(self, marionette):
        self.marionette = marionette
        lockscreen_panel = self.marionette.find_element(*self._lockscreen_panel_locator)
        emergency_button = self.marionette.find_element(*self._emergency_button_locator)
        self.wait_for_condition(lambda m: lockscreen_panel.size['height'] >
              (emergency_button.size['height'] + emergency_button.location['y']))

    def type_passcode(self, passcode):
        for digit in passcode:
            button_locator = (self._numeric_button_locator[0],
                              self._numeric_button_locator[1] % digit)
            self.marionette.find_element(*button_locator).tap()
        return Homescreen(self.marionette)

    def tap_emergency_call(self):
        self.marionette.find_element(*self._emergency_button_locator).tap()
        emergency_call = EmergencyCall(self.marionette)
        return emergency_call
