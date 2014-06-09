# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time

from marionette.by import By
from gaiatest.apps.base import Base


class Activities(Base):

    _actions_menu_locator = (By.CSS_SELECTOR, 'body > form[data-type="action"]')
    _settings_button_locator = (By.XPATH, '//*[text()="Settings"]')
    _add_subject_button_locator = (By.CSS_SELECTOR, 'button[data-l10n-id="add-subject"]')
    _add_to_contact_button_locator = (By.XPATH, '//*[text()="Add to an existing contact"]')
    _create_new_contact_button_locator = (By.CSS_SELECTOR, 'button[data-l10n-id="createNewContact"]')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        self.wait_for_element_displayed(*self._actions_menu_locator)
        # TODO Difficult intermittent bug 977052
        time.sleep(1)

    def tap_settings(self):
        self.marionette.find_element(*self._settings_button_locator).tap()
        self.wait_for_condition(lambda m: self.apps.displayed_app.name == 'Settings')
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

        from gaiatest.apps.contacts.app import Contacts
        contacts = Contacts(self.marionette)
        contacts.switch_to_contacts_frame()
        return contacts
