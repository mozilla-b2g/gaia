# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time

from marionette.by import By
from marionette.marionette import Actions

from gaiatest.apps.base import Base
from gaiatest.apps.phone.app import Phone
from gaiatest.apps.phone.regions.call_screen import CallScreen


class Keypad(Phone):

    #locators
    _keyboard_container_locator = (By.ID, 'keyboard-container')
    _phone_number_view_locator = (By.ID, 'phone-number-view')
    _call_bar_locator = (By.ID, 'keypad-callbar-call-action')
    _add_new_contact_button_locator = (By.ID, 'keypad-callbar-add-contact')

    def __init__(self, marionette):
        Phone.__init__(self, marionette)

    @property
    def phone_number(self):
        return self.marionette.find_element(*self._phone_number_view_locator).get_attribute('value')

    def dial_phone_number(self, value):
        for i in value:
            if i == "+":
                zero_button = self.marionette.find_element(By.CSS_SELECTOR, 'div.keypad-key[data-value="0"]')
                Actions(self.marionette).long_press(zero_button, 1.2).perform()
            else:
                self.marionette.find_element(By.CSS_SELECTOR, 'div.keypad-key[data-value="%s"]' % i).tap()
                time.sleep(0.25)

    def call_number(self, value):
        self.dial_phone_number(value)
        return self.tap_call_button()

    def tap_call_button(self, switch_to_call_screen=True):
        self.marionette.find_element(*self._call_bar_locator).tap()
        if switch_to_call_screen:
            return CallScreen(self.marionette)

    def tap_add_contact(self):
        self.marionette.find_element(*self._add_new_contact_button_locator).tap()
        return AddNewNumber(self.marionette)

    def switch_to_keypad_frame(self):
        app = self.apps.displayed_app
        self.marionette.switch_to_frame(app.frame)


class AddNewNumber(Base):
    _create_new_contact_locator = (By.ID, 'create-new-contact-menuitem')
    _new_contact_frame_locator = (By.CSS_SELECTOR, "iframe[src^='app://communications'][src$='contacts/index.html?new']")

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        self.wait_for_element_displayed(*self._create_new_contact_locator)

    def tap_create_new_contact(self):
        self.marionette.find_element(*self._create_new_contact_locator).tap()

        self.marionette.switch_to_frame()
        self.wait_for_element_present(*self._new_contact_frame_locator)
        frame = self.marionette.find_element(*self._new_contact_frame_locator)
        self.marionette.switch_to_frame(frame)

        from gaiatest.apps.contacts.regions.contact_form import NewContact
        return NewContact(self.marionette)
