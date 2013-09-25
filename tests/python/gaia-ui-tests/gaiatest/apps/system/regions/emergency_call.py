# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.base import Base


class EmergencyCallScreen(Base):

    _emergency_frame_locator = (By.CSS_SELECTOR, 'iframe[src*="/emergency-call/"]')
    _emergency_dialer_keypad_locator = (By.ID, 'keypad')

    def switch_to_emergency_call_screen(self):
        self.marionette.switch_to_frame()
        emergency_frame = self.marionette.find_element(*self._emergency_frame_locator)
        self.marionette.switch_to_frame(emergency_frame)
        self.wait_for_condition(
            lambda m: m.execute_script('return document.title') == 'Emergency Call Dialer')

    @property
    def is_emergency_dialer_keypad_displayed(self):
        return self.is_element_displayed(*self._emergency_dialer_keypad_locator)
