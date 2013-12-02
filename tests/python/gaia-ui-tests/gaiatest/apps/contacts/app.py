# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.base import Base
from gaiatest.apps.base import PageRegion


class Contacts(Base):

    name = "Contacts"

    _new_contact_button_locator = (By.ID, 'add-contact-button')
    _settings_button_locator = (By.ID, 'settings-button')
    _favorites_list_locator = (By.ID, 'contacts-list-favorites')
    _contacts_frame_locator = (By.CSS_SELECTOR, 'iframe[src*="contacts"][src*="/index.html"]')
    _select_all_button_locator = (By.CSS_SELECTOR, 'button[data-l10n-id="selectAll"]')
    _export_button_locator = (By.ID, 'select-action')
    _status_message_locator = (By.ID, 'statusMsg')
    _select_contacts_to_import_frame_locator = (By.ID, 'fb-extensions')
    _import_locator = (By.ID, 'import-action')
    _first_contact_locator = (By.CSS_SELECTOR, 'li.block-item label.pack-checkbox')

    #  contacts
    _contact_locator = (By.CSS_SELECTOR, 'li.contact-item')

    def launch(self):
        Base.launch(self)
        self.wait_for_element_displayed(*self._settings_button_locator)

    def switch_to_contacts_frame(self):
        self.marionette.switch_to_frame()
        self.wait_for_element_present(*self._contacts_frame_locator)
        contacts_frame = self.marionette.find_element(*self._contacts_frame_locator)
        self.marionette.switch_to_frame(contacts_frame)

    def switch_to_select_contacts_frame(self):
        self.switch_to_contacts_frame()
        self.wait_for_element_displayed(*self._select_contacts_to_import_frame_locator)
        select_contacts = self.marionette.find_element(*self._select_contacts_to_import_frame_locator)
        self.marionette.switch_to_frame(select_contacts)

    def tap_first_contact(self):
        self.marionette.find_element(*self._first_contact_locator).tap()

    def tap_import_button(self):
        self.marionette.find_element(*self._import_locator).tap()
        from gaiatest.apps.contacts.regions.settings_form import SettingsForm
        return SettingsForm(self.marionette)

    @property
    def contacts(self):
        return [self.Contact(marionette=self.marionette, element=contact)
                for contact in self.marionette.find_elements(*self._contact_locator)]

    def wait_for_contacts(self, number_to_wait_for=1):
        self.wait_for_condition(lambda m: len(m.find_elements(*self._contact_locator)) == number_to_wait_for)

    def wait_for_contacts_frame_to_close(self):
        self.marionette.switch_to_default_content()
        self.wait_for_element_not_present(*self._contacts_frame_locator)

    def contact(self, name):
        for contact in self.contacts:
            if contact.name == name:
                return contact

    def tap_new_contact(self):
        self.marionette.find_element(*self._new_contact_button_locator).tap()
        from gaiatest.apps.contacts.regions.contact_form import NewContact
        return NewContact(self.marionette)

    def tap_settings(self):
        self.marionette.find_element(*self._settings_button_locator).tap()
        from gaiatest.apps.contacts.regions.settings_form import SettingsForm
        return SettingsForm(self.marionette)

    def tap_select_all(self):
        self.marionette.find_element(*self._select_all_button_locator).tap()

    def tap_export(self):
        self.marionette.find_element(*self._export_button_locator).tap()

    @property
    def is_favorites_list_displayed(self):
        return self.marionette.find_element(*self._favorites_list_locator).is_displayed()

    @property
    def status_message(self):
        self.wait_for_element_displayed(*self._status_message_locator)
        return self.marionette.find_element(*self._status_message_locator).text

    class Contact(PageRegion):

        _name_locator = (By.CSS_SELECTOR, 'p > strong')
        _full_name_locator = (By.CSS_SELECTOR, 'p')

        @property
        def name(self):
            return self.root_element.find_element(*self._name_locator).text

        @property
        def full_name(self):
            return self.root_element.find_element(*self._full_name_locator).text

        def tap(self, return_details=True):
            self.root_element.find_element(*self._name_locator).tap()

            if return_details:
                from gaiatest.apps.contacts.regions.contact_details import ContactDetails
                return ContactDetails(self.marionette)
