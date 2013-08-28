# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.base import Base
from gaiatest.apps.base import PageRegion


class Contacts(Base):

    name = "Contacts"

    _loading_overlay_locator = (By.ID, 'loading-overlay')
    _new_contact_button_locator = (By.ID, 'add-contact-button')
    _settings_button_locator = (By.ID, 'settings-button')
    _favorites_list_locator = (By.ID, 'contacts-list-favorites')

    #  contacts
    _contact_locator = (By.CSS_SELECTOR, 'li.contact-item')

    def launch(self):
        Base.launch(self)
        self.wait_for_element_not_displayed(*self._loading_overlay_locator)
        self.wait_for_element_displayed(*self._settings_button_locator)

    @property
    def contacts(self):
        self.wait_for_element_displayed(*self._new_contact_button_locator)
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
        return NewContact(self.marionette)

    def tap_settings(self):
        self.marionette.find_element(*self._settings_button_locator).tap()
        from gaiatest.apps.contacts.regions.settings_form import SettingsForm
        return SettingsForm(self.marionette)

    @property
    def is_favorites_list_displayed(self):
        return self.marionette.find_element(*self._favorites_list_locator).is_displayed()

    class Contact(PageRegion):

        _name_locator = (By.CSS_SELECTOR, 'p > strong')
        _full_name_locator = (By.CSS_SELECTOR, 'p')

        @property
        def name(self):
            return self.root_element.find_element(*self._name_locator).text

        @property
        def full_name(self):
            return self.root_element.find_element(*self._full_name_locator).text

        def tap(self):
            self.root_element.find_element(*self._name_locator).tap()

            from gaiatest.apps.contacts.regions.contact_details import ContactDetails
            return ContactDetails(self.marionette)
