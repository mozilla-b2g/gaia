# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from marionette.marionette import Actions
from gaiatest.apps.base import Base

class EmergencyCall(Base):

    _emergency_frame_locator = (By.CSS_SELECTOR, 'iframe[src*="emergency-call"]')
    _emergency_dialer_keypad_locator = (By.ID, 'keypad')

    def switch_to_emergency_call_frame(self):
        self.wait_for_element_displayed(*self._emergency_frame_locator)
        emergency_frame = self.marionette.find_element(*self._emergency_frame_locator)
        self.marionette.switch_to_frame(emergency_frame)

    @property
    def is_emergency_dialer_keypad_displayed(self):
        self.wait_for_element_displayed(*self._emergency_dialer_keypad_locator)
        return self.is_element_displayed(*self._emergency_dialer_keypad_locator)

