# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.base import Base


class ScreenLock(Base):

    _screen_lock_section_locator = (By.ID, 'screenLock')
    _passcode_enable_locator = (By.CSS_SELECTOR, 'li.lockscreen-enabled label')
    _screen_lock_passcode_section_locator = (By.ID, 'screenLock-passcode')
    _passcode_create_locator = (By.CLASS_NAME, 'passcode-create')

    def enable_passcode_lock(self):
        # This wait would be in __init__ but lockscreen could be disabled meaning init would timeout
        self.wait_for_element_displayed(*self._passcode_enable_locator)
        self.marionette.find_element(*self._passcode_enable_locator).tap()
        self.wait_for_condition(lambda m:
            m.find_element(*self._screen_lock_passcode_section_locator).location['x'] == 0)

    def create_passcode(self, passcode):

        # switch to keyboard, input passcode
        for times in range(2):
            self.keyboard.send("".join(passcode))

        # Back to create passcode
        self.wait_for_element_displayed(*self._screen_lock_passcode_section_locator)
        self.marionette.find_element(*self._passcode_create_locator).tap()
        self.wait_for_element_displayed(*self._screen_lock_section_locator)
