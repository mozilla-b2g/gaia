# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

try:
    from marionette import Wait
    from marionette import expected
    from marionette.by import By
except:
    from marionette_driver import Wait
    from marionette_driver import expected
    from marionette_driver.by import By

from gaiatest.apps.base import Base


class ScreenLock(Base):

    _screen_lock_section_locator = (By.ID, 'screenLock')
    _passcode_enable_locator = (By.CSS_SELECTOR, 'li.lockscreen-enabled label')
    _screen_lock_passcode_section_locator = (By.ID, 'screenLock-passcode')
    _passcode_create_locator = (By.CLASS_NAME, 'passcode-create')

    def enable_passcode_lock(self):
        # This wait would be in __init__ but lockscreen could be disabled meaning init would timeout
        element = Wait(self.marionette).until(expected.element_present(*self._passcode_enable_locator))
        Wait(self.marionette).until(expected.element_displayed(element))
        element.tap()
        section = self.marionette.find_element(*self._screen_lock_passcode_section_locator)
        Wait(self.marionette).until(lambda m: section.location['x'] == 0)

    def create_passcode(self, passcode):

        # switch to keyboard, input passcode
        for times in range(2):
            self.keyboard.send("".join(passcode))

        # Back to create passcode
        Wait(self.marionette).until(expected.element_displayed(
            *self._screen_lock_passcode_section_locator))
        self.marionette.find_element(*self._passcode_create_locator).tap()
        Wait(self.marionette).until(expected.element_displayed(
            *self._screen_lock_section_locator))
