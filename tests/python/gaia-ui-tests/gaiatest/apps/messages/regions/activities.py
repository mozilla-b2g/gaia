# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base


class Activities(Base):

    _actions_menu_locator = (By.CSS_SELECTOR, 'body > form[data-type="action"]')
    _settings_button_locator = (By.XPATH, '//*[text()="Settings"]')
    _add_subject_button_locator = (By.CSS_SELECTOR, 'button[data-l10n-id="add-subject"]')
    _add_to_contact_button_locator = (By.XPATH, '//*[text()="Add to an existing contact"]')
    _create_new_contact_button_locator = (By.CSS_SELECTOR, 'button[data-l10n-id="createNewContact"]')
    _forward_message_button_locator = (By.CSS_SELECTOR, 'button[data-l10n-id="forward"]')
    _delete_message_button_locator = (By.CSS_SELECTOR, 'form[data-type="action"] button[data-l10n-id="delete"]')
    _confirm_delete_message_locator = (By.CSS_SELECTOR, 'button.danger')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        Wait(self.marionette).until(expected.element_displayed(
            Wait(self.marionette).until(expected.element_present(
                *self._actions_menu_locator))))
        # TODO Difficult intermittent bug 977052
        time.sleep(1)

    def tap_settings(self):
        self.marionette.find_element(*self._settings_button_locator).tap()
        Wait(self.marionette).until(lambda m: self.apps.displayed_app.name == 'Settings')
        self.apps.switch_to_displayed_app()
        from gaiatest.apps.messages.regions.messaging_settings import MessagingSettings
        return MessagingSettings(self.marionette)

    def tap_add_subject(self):
        self.marionette.find_element(*self._add_subject_button_locator).tap()

    def tap_add_to_contact(self):
        self.marionette.find_element(*self._add_to_contact_button_locator).tap()

        from gaiatest.apps.contacts.app import Contacts
        contacts = Contacts(self.marionette)
        contacts.switch_to_contacts_frame()
        return contacts

    def tap_create_new_contact(self):
        self.marionette.find_element(*self._create_new_contact_button_locator).tap()

        from gaiatest.apps.contacts.regions.contact_form import NewContact
        new_contact = NewContact(self.marionette)
        new_contact.switch_to_new_contact_form()
        return new_contact

    def tap_forward_message(self):
        self.marionette.find_element(*self._forward_message_button_locator).tap()
        from gaiatest.apps.messages.regions.new_message import NewMessage
        return NewMessage(self.marionette)

    def tap_delete_message(self):
        delete_message_button = self.marionette.find_element(*self._delete_message_button_locator)
        Wait(self.marionette).until(expected.element_displayed(delete_message_button))
        delete_message_button.tap()

    def confirm_delete_message(self):
        confirm_delete_message = self.marionette.find_element(*self._confirm_delete_message_locator)
        Wait(self.marionette).until(expected.element_displayed(confirm_delete_message))
        confirm_delete_message.tap()
        Wait(self.marionette).until(expected.element_not_displayed(confirm_delete_message))
