# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.base import Base


class PhoneLock(Base):

    _settings_frame_locator = (By.CSS_SELECTOR, "iframe[mozapp^='app://settings'][mozapp$='manifest.webapp']")
    _phone_lock_section_locator = (By.ID, 'phoneLock')
    _passcode_enable_locator = (By.CSS_SELECTOR, 'li.lockscreen-enabled label')
    _phone_lock_passcode_section_locator = (By.ID, 'phoneLock-passcode')
    _passcode_create_locator = (By.ID, 'passcode-create')
    _phone_lock_sheet_locator = (By.CSS_SELECTOR, 'iframe[src*="/pages/phone_lock.html"]')
    _phone_lock_passcode_sheet_locator = (By.CSS_SELECTOR, 'iframe[src*="/pages/phone_lock_passcode.html"]')

    def enable_passcode_lock(self):
        self.wait_for_element_displayed(*self._passcode_enable_locator)
        self.marionette.find_element(*self._passcode_enable_locator).tap()

        # switch to new sheet
        passcode_sheet = self.marionette.find_element(*self._phone_lock_passcode_sheet_locator)
        self.marionette.switch_to_frame(passcode_sheet)

        self.wait_for_element_displayed(*self._phone_lock_passcode_section_locator)

    def create_passcode(self, passcode):
        # switch to keyboard, input passcode
        for times in range(2):
            self.keyboard.send("".join(passcode), True)

        self.keyboard.dismiss()

        # switch to passcode frame
        self.marionette.switch_to_frame()
        self.marionette.switch_to_frame(self.marionette.find_element(*self._settings_frame_locator))
        self.marionette.switch_to_frame(self.marionette.find_element(*self._phone_lock_sheet_locator))
        self.marionette.switch_to_frame(self.marionette.find_element(*self._phone_lock_passcode_sheet_locator))

        # create passcode
        self.wait_for_element_displayed(*self._phone_lock_passcode_section_locator)
        self.marionette.find_element(*self._passcode_create_locator).tap()

        # switch to phone lock frame
        self.marionette.switch_to_frame()
        self.marionette.switch_to_frame(self.marionette.find_element(*self._settings_frame_locator))
        self.marionette.switch_to_frame(self.marionette.find_element(*self._phone_lock_sheet_locator))
        self.wait_for_element_displayed(*self._phone_lock_section_locator)
