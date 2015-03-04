# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import By, Wait

from gaiatest.apps.base import Base
from gaiatest.apps.homescreen.app import Homescreen
from gaiatest.apps.emergency_call.app import EmergencyCall


class PasscodePad(Base):

    _lockscreen_passcode_code_locator = (By.ID, 'lockscreen-passcode-code')
    _lockscreen_passcode_pad_locator = (By.ID, 'lockscreen-passcode-pad')
    _numeric_button_locator = (By.CSS_SELECTOR, '#lockscreen-passcode-pad a[data-key="%s"]')
    _emergency_button_locator = (By.CSS_SELECTOR, '#lockscreen-passcode-pad a[data-key="e"]')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        lockscreen_passcode_pad = self.marionette.find_element(*self._lockscreen_passcode_pad_locator)
        emergency_button = self.marionette.find_element(*self._emergency_button_locator)
        # wait button * 4 rows === the pad's height
        Wait(self.marionette).until(
            lambda m: lockscreen_passcode_pad.size['height'] ==
            (4 * emergency_button.size['height']))

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
