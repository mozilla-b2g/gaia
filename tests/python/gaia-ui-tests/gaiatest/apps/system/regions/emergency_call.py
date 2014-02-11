# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.base import Base


class EmergencyCallScreen(Base):

    _frame_src_match = "/emergency-call/"

    _emergency_dialer_keypad_locator = (By.ID, 'keypad')

    @property
    def is_emergency_dialer_keypad_displayed(self):
        return self.is_element_displayed(*self._emergency_dialer_keypad_locator)
