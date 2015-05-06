# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base


class ScreenLock(Base):

    _screen_lock_section_locator = (By.ID, 'screenLock')
    _lockscreen_checkbox_locator = (By.XPATH, '//li/label[span[@data-l10n-id="lockScreen"]]')
    _passcode_checkbox_locator = (By.XPATH, '//li/label[span[@data-l10n-id="passcode-lock"]]')
    _screen_lock_passcode_section_locator = (By.ID, 'screenLock-passcode')
    _passcode_create_locator = (By.CLASS_NAME, 'passcode-create')

    def enable_lockscreen(self):
        label = Wait(self.marionette).until(
            expected.element_present(*self._lockscreen_checkbox_locator))
        Wait(self.marionette).until(expected.element_displayed(label))
        label.tap()
        checkbox = label.find_element(By.TAG_NAME, 'input')
        Wait(self.marionette).until(expected.element_selected(checkbox))

    def enable_passcode_lock(self):
        label = Wait(self.marionette).until(
            expected.element_present(*self._passcode_checkbox_locator))
        Wait(self.marionette).until(expected.element_displayed(label))
        label.tap()
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
