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
    _keypad_delete_locator = (By.ID, 'keypad-delete')
    _call_bar_locator = (By.ID, 'keypad-callbar-call-action')
    _add_new_contact_button_locator = (By.ID, 'keypad-callbar-add-contact')
    _search_popup_locator = (By.CSS_SELECTOR, '#suggestion-bar .js-suggestion-item')
    _suggested_contact_name_locator = (By.CSS_SELECTOR, '#suggestion-bar .js-suggestion-item .js-name')
    _suggested_contact_phone_number_locator = (By.CSS_SELECTOR, '#suggestion-bar .js-suggestion-item .js-tel')

    def __init__(self, marionette):
        Phone.__init__(self, marionette)
        self.wait_for_condition(lambda m: self.apps.displayed_app.name == self.name)
        self.apps.switch_to_displayed_app()
        keypad_toolbar_button = self.marionette.find_element(*self._keypad_toolbar_button_locator)
        self.wait_for_condition(lambda m: 'toolbar-option-selected' in keypad_toolbar_button.get_attribute('class'))

    @property
    def phone_number(self):
        return self.marionette.find_element(*self._phone_number_view_locator).get_attribute('value')

    def tap_phone_number(self):
        self.marionette.find_element(*self._phone_number_view_locator).tap()

    def dial_phone_number(self, value):
        for i in value:
            if i == "+":
                zero_button = self.marionette.find_element(By.CSS_SELECTOR, 'div.keypad-key[data-value="0"]')
                Actions(self.marionette).long_press(zero_button, 1.2).perform()
            else:
                self.marionette.find_element(By.CSS_SELECTOR, 'div.keypad-key[data-value="%s"]' % i).tap()
                time.sleep(0.25)

    def a11y_dial_phone_number(self, value):
        for i in value:
            self.accessibility.click(self.marionette.find_element(
                By.CSS_SELECTOR, 'div.keypad-key[data-value="%s"]' % i))
            time.sleep(0.25)

    def call_number(self, value):
        self.dial_phone_number(value)
        return self.tap_call_button()

    def a11y_call_number(self, value):
        self.a11y_dial_phone_number(value)
        return self.a11y_click_call_button()

    def tap_call_button(self, switch_to_call_screen=True):
        self.marionette.find_element(*self._call_bar_locator).tap()
        if switch_to_call_screen:
            return CallScreen(self.marionette)

    def a11y_click_call_button(self, switch_to_call_screen=True):
        self.accessibility.click(self.marionette.find_element(*self._call_bar_locator))
        if switch_to_call_screen:
            return CallScreen(self.marionette)

    def tap_add_contact(self):
        self.marionette.find_element(*self._add_new_contact_button_locator).tap()
        return AddNewNumber(self.marionette)

    def wait_for_search_popup_visible(self):
        self.wait_for_element_displayed(*self._search_popup_locator)

    @property
    def suggested_name(self):
        return self.marionette.find_element(*self._suggested_contact_name_locator).text

    @property
    def suggested_phone_number(self):
        return self.marionette.find_element(*self._suggested_contact_phone_number_locator).text

    def tap_search_popup(self):
        self.marionette.find_element(*self._search_popup_locator).tap()
        return CallScreen(self.marionette)

    def wait_for_phone_number_ready(self):
        # Entering dialer and expecting a phone number there is js that sets the phone value and enables this button
        self.wait_for_condition(lambda m: m.find_element(*self._add_new_contact_button_locator).is_enabled())


class AddNewNumber(Base):
    _create_new_contact_locator = (By.ID, 'create-new-contact-menuitem')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        self.wait_for_element_displayed(*self._create_new_contact_locator)

    def tap_create_new_contact(self):
        self.marionette.find_element(*self._create_new_contact_locator).tap()

        from gaiatest.apps.contacts.regions.contact_form import NewContact
        new_contact = NewContact(self.marionette)
        new_contact.switch_to_new_contact_form()
        return new_contact
