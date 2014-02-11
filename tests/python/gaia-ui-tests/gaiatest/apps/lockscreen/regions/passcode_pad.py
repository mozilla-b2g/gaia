# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.base import Base
from gaiatest.apps.homescreen.app import Homescreen


class PasscodePad(Base):

    _numeric_button_locator = (By.CSS_SELECTOR, '.lockscreen-panel a[data-key="%s"]')
    _emergency_button_locator = (By.CSS_SELECTOR, '.lockscreen-panel a[data-key="e"]')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        self.marionette = marionette
        self.wait_for_element_displayed(*self._emergency_button_locator)

    def type_passcode(self, passcode):
        for digit in passcode:
            button_locator = (self._numeric_button_locator[0],
                              self._numeric_button_locator[1] % digit)
            self.marionette.find_element(*button_locator).tap()
        return Homescreen(self.marionette)

    def tap_emergency_call(self):
        self.marionette.find_element(*self._emergency_button_locator).tap()

        from gaiatest.apps.system.regions.emergency_call import EmergencyCallScreen
        emergency_screen = EmergencyCallScreen(self.marionette)
        self.frame_manager.wait_for_and_switch_to_top_frame(emergency_screen._frame_src_match)
        return emergency_screen
