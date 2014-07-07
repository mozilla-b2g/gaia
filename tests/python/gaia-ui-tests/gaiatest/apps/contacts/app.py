# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from marionette.errors import JavascriptException
from marionette import Wait

from gaiatest.apps.base import Base
from gaiatest.apps.base import PageRegion


class Contacts(Base):

    name = "Contacts"

    _new_contact_button_locator = (By.ID, 'add-contact-button')
    _settings_button_locator = (By.ID, 'settings-button')
    _favorites_list_locator = (By.ID, 'contacts-list-favorites')
    _select_all_wrapper_locator = (By.ID, 'select-all-wrapper')
    _select_all_button_locator = (By.CSS_SELECTOR, 'button[data-l10n-id="selectAll"]')
    _export_button_locator = (By.ID, 'select-action')
    _status_message_locator = (By.ID, 'statusMsg')

    #  contacts
    _contact_locator = (By.CSS_SELECTOR, 'li.contact-item')

    def launch(self):
        Base.launch(self)
        Wait(self.marionette, ignored_exceptions=JavascriptException).until(
            lambda m: m.execute_script('return window.wrappedJSObject.Contacts.asyncScriptsLoaded') is True)
        self.wait_for_element_displayed(*self._settings_button_locator)

    def switch_to_contacts_frame(self):
        self.wait_for_condition(lambda m: self.apps.displayed_app.name == self.name)
        self.apps.switch_to_displayed_app()
        Wait(self.marionette, ignored_exceptions=JavascriptException).until(
            lambda m: m.execute_script('return window.wrappedJSObject.Contacts.asyncScriptsLoaded') is True)

    @property
    def contacts(self):
        return [self.Contact(marionette=self.marionette, element=contact)
                for contact in self.marionette.find_elements(*self._contact_locator)]

    def wait_for_contacts(self, number_to_wait_for=1):
        self.wait_for_condition(lambda m: len(m.find_elements(*self._contact_locator)) == number_to_wait_for)

    def contact(self, name):
        for contact in self.contacts:
            if contact.name == name:
                return contact

    def tap_new_contact(self):
        self.marionette.find_element(*self._new_contact_button_locator).tap()
        from gaiatest.apps.contacts.regions.contact_form import NewContact
        new_contact = NewContact(self.marionette)
        new_contact.wait_for_new_contact_form_to_load()
        return new_contact

    def tap_settings(self):
        self.marionette.find_element(*self._settings_button_locator).tap()
        from gaiatest.apps.contacts.regions.settings_form import SettingsForm
        return SettingsForm(self.marionette)

    def tap_select_all(self):
        window_height = self.marionette.execute_script('return window.wrappedJSObject.innerHeight')
        wrapper = self.marionette.find_element(*self._select_all_wrapper_locator)
        self.wait_for_condition(lambda m: int(wrapper.size['height'] + wrapper.location['y']) == window_height)

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

        def tap(self, return_class='ContactDetails'):
            self.root_element.find_element(*self._name_locator).tap()

            if return_class == 'ContactDetails':
                from gaiatest.apps.contacts.regions.contact_details import ContactDetails
                return ContactDetails(self.marionette)
            elif return_class == 'EditContact':
                # This may seem superfluous but we can enter EditContact from Contacts, or from ActivityPicker
                self.wait_for_condition(lambda m: self.apps.displayed_app.name == Contacts.name)
                self.apps.switch_to_displayed_app()
                from gaiatest.apps.contacts.regions.contact_form import EditContact
                return EditContact(self.marionette)
            else:
                # We are using contacts picker in activity - after choosing, fall back to open app
                self.wait_for_condition(lambda m: self.apps.displayed_app.name != Contacts.name)
                self.apps.switch_to_displayed_app()
