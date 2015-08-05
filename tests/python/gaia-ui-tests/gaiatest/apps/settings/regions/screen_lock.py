# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base


class ScreenLock(Base):

    _screen_lock_section_locator = (By.ID, 'screenLock')
    _lockscreen_checkbox_locator = (By.XPATH, '//li/gaia-switch[@name="lockscreen.enabled"]')
    _passcode_checkbox_locator = (By.XPATH, '//li/gaia-switch[@name="lockscreen.passcode-lock.enabled"]')
    _screen_lock_passcode_section_locator = (By.ID, 'screenLock-passcode')
    _passcode_create_locator = (By.CSS_SELECTOR, '#screenLock-passcode gaia-header button[type="submit"]')

    @property
    def screen_element(self):
        return self.marionette.find_element(*self._screen_lock_section_locator)

    def enable_lockscreen(self):
        checkbox = Wait(self.marionette).until(
            expected.element_present(*self._lockscreen_checkbox_locator))
        Wait(self.marionette).until(expected.element_displayed(checkbox))
        checkbox.tap()

    def enable_passcode_lock(self):
        checkbox = Wait(self.marionette).until(
            expected.element_present(*self._passcode_checkbox_locator))
        Wait(self.marionette).until(expected.element_displayed(checkbox))
        checkbox.tap()
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
