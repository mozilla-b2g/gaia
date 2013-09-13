# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.base import Base


class Phone(Base):

    name = "Phone"

    _dialog_locator = (By.ID, 'confirmation-message')
    _dialog_title_locator = (By.XPATH, "//*[@id='confirmation-message']/section/h1")
    _call_log_toolbar_button_locator = (By.ID, 'option-recents')
    _contacts_view_locator = (By.ID, 'option-contacts')
    _keypad_toolbar_button_locator = (By.ID, 'option-keypad')

    _contacts_frame_locator = (By.ID, 'iframe-contacts')

    @property
    def keypad(self):
        from gaiatest.apps.phone.regions.keypad import Keypad
        return Keypad(self.marionette)

    def tap_contacts(self):
        self.marionette.find_element(*self._contacts_view_locator).tap()

        self.wait_for_element_present(*self._contacts_frame_locator)
        frame = self.marionette.find_element(*self._contacts_frame_locator)
        self.marionette.switch_to_frame(frame)

        from gaiatest.apps.contacts.app import Contacts
        return Contacts(self.marionette)

    @property
    def call_screen(self):
        from gaiatest.apps.phone.regions.call_screen import CallScreen
        return CallScreen(self.marionette)

    @property
    def call_log(self):
        from gaiatest.apps.phone.regions.call_log import CallLog
        return CallLog(self.marionette)

    @property
    def confirmation_dialog_text(self):
        return self.marionette.find_element(*self._dialog_title_locator).text

    def wait_for_confirmation_dialog(self):
        self.wait_for_element_displayed(*self._dialog_locator)

    def tap_call_log_toolbar_button(self):
        self.wait_for_element_displayed(*self._call_log_toolbar_button_locator)
        self.marionette.find_element(*self._call_log_toolbar_button_locator).tap()
        return self.call_log

    def tap_keypad_toolbar_button(self):
        self.wait_for_element_displayed(*self._keypad_toolbar_button_locator)
        self.marionette.find_element(*self._keypad_toolbar_button_locator).tap()
        return self.keypad

    def make_call_and_hang_up(self, phone_number):
        """Just makes a call and hangs up. Does not do any assertions."""
        call_screen = self.keypad.call_number(phone_number)
        call_screen.wait_for_outgoing_call()
        call_screen.hang_up()
