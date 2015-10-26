# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import PageRegion

from gaiatest.form_controls.binarycontrol import GaiaBinaryControl

class ScreenLock(PageRegion):

    _root_locator = (By.ID, 'screenLock')
    _lockscreen_checkbox_locator = (By.XPATH, '//li/gaia-switch[@name="lockscreen.enabled"]')
    _passcode_checkbox_locator = (By.XPATH, '//li/gaia-switch[@name="lockscreen.passcode-lock.enabled"]')
    _screen_lock_passcode_section_locator = (By.ID, 'screenLock-passcode')
    _passcode_create_locator = (By.CSS_SELECTOR, '#screenLock-passcode gaia-header button[type="submit"]')

    def __init__(self, marionette):
        root = marionette.find_element(*self._root_locator)
        PageRegion.__init__(self, marionette, root)
        Wait(self.marionette).until(expected.element_displayed(*self._lockscreen_checkbox_locator))

    @property
    def screen_element(self):
        return self.marionette.find_element(*self._root_locator)

    @property
    def passcode_screen_element(self):
        return self.marionette.find_element(*self._screen_lock_passcode_section_locator)

    @property
    def _lockscreen_switch(self):
        return GaiaBinaryControl(self.marionette, self._lockscreen_checkbox_locator)

    def enable_lockscreen(self):
        self._lockscreen_switch.enable()
        Wait(self.marionette).until(expected.element_present(*self._passcode_checkbox_locator) and
                                    expected.element_present(*self._passcode_checkbox_locator))

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
            *self._root_locator))
