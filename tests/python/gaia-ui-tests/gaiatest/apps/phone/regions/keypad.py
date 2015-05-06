# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time

from marionette_driver import expected, By, Wait
from marionette_driver.marionette import Actions

from gaiatest.apps.base import Base
from gaiatest.apps.phone.regions.call_screen import CallScreen


class BaseKeypad(Base):

    _phone_number_view_locator = (By.ID, 'phone-number-view')
    _keypad_delete_locator = (By.ID, 'keypad-delete')
    _call_bar_locator = (By.ID, 'keypad-callbar-call-action')

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

    def clear_phone_number(self):
        delete_button = self.marionette.find_element(*self._keypad_delete_locator)
        Actions(self.marionette).long_press(delete_button, 1).perform()

    def a11y_dial_phone_number(self, value):
        for i in value:
            self.accessibility.click(self.marionette.find_element(
                By.CSS_SELECTOR, 'div.keypad-key[data-value="%s"]' % i))
            time.sleep(0.25)

    def a11y_call_number(self, value):
        self.a11y_dial_phone_number(value)
        return self.a11y_click_call_button()

    def tap_call_button(self, switch_to_call_screen=True):
        element = Wait(self.marionette).until(
            expected.element_present(*self._call_bar_locator))
        Wait(self.marionette).until(expected.element_enabled(element))
        element.tap()
        if switch_to_call_screen:
            return CallScreen(self.marionette)

    def a11y_click_call_button(self, switch_to_call_screen=True):
        self.accessibility.click(self.marionette.find_element(*self._call_bar_locator))
        if switch_to_call_screen:
            return CallScreen(self.marionette)


from gaiatest.apps.phone.app import Phone


class Keypad(BaseKeypad, Phone):

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

    def tap_add_contact(self):
        self.marionette.find_element(*self._add_new_contact_button_locator).tap()
        return AddNewNumber(self.marionette)

    def wait_for_search_popup_visible(self):
        Wait(self.marionette).until(
            expected.element_displayed(*self._search_popup_locator))

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
        # entering dialer and expecting a phone number there is javascript that
        # sets the phone value and enables this button
        add_contact = self.marionette.find_element(
            *self._add_new_contact_button_locator)
        Wait(self.marionette).until(expected.element_enabled(add_contact))


class AddNewNumber(Base):
    _create_new_contact_locator = (By.CSS_SELECTOR, '[data-l10n-id=createNewContact]')
    _form_locator = (By.CSS_SELECTOR, 'form.visible[data-type="action"]')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        form = self.marionette.find_element(*self._form_locator)
        Wait(self.marionette).until(lambda m: form.location['y'] == 0)

    def tap_create_new_contact(self):

        create_new_contact = self.marionette.find_element(*self._create_new_contact_locator)
        Wait(self.marionette).until(expected.element_displayed(create_new_contact))
        create_new_contact.tap()

        from gaiatest.apps.contacts.regions.contact_form import NewContact
        new_contact = NewContact(self.marionette)
        new_contact.switch_to_new_contact_form()
        return new_contact
