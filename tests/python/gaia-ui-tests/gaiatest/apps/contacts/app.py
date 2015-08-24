# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait
from marionette_driver.errors import JavascriptException

from gaiatest.apps.base import Base
from gaiatest.apps.base import PageRegion


class Contacts(Base):

    name = "Contacts"

    _new_contact_button_locator = (By.ID, 'add-contact-button')
    _settings_button_locator = (By.ID, 'settings-button')
    _favorites_list_locator = (By.ID, 'contacts-list-favorites')
    _select_all_wrapper_locator = (By.ID, 'select-all-wrapper')
    _select_all_button_locator = (By.CSS_SELECTOR, 'button[data-l10n-id="selectAll"]')
    _select_action_button_locator = (By.ID, 'select-action')
    _status_message_locator = (By.ID, 'statusMsg')
    _confirm_delete_locator = (By.CSS_SELECTOR, 'button.danger[data-l10n-id="delete"]')
    _no_contacts_message_locator = (By.CSS_SELECTOR, '*[data-l10n-id="no-contacts"]')
    _group_container_selector = "#groups-container"
    _contact_locator = (By.CSS_SELECTOR, 'li[data-uuid]:not([data-group="ice"])')

    def launch(self):
        Base.launch(self)
        Wait(self.marionette).until(expected.element_displayed(
            Wait(self.marionette).until(expected.element_present(
                *self._settings_button_locator))))

    def switch_to_contacts_frame(self):
        Wait(self.marionette).until(lambda m: self.apps.displayed_app.name == self.name)
        self.apps.switch_to_displayed_app()

    @property
    def contacts(self):
        return [self.Contact(marionette=self.marionette, element=contact)
                for contact in self.marionette.find_elements(*self._contact_locator)]

    def wait_for_contacts(self, number_to_wait_for=1):
        Wait(self.marionette).until(lambda m: len(m.find_elements(
            *self._contact_locator)) == number_to_wait_for)

        # we need to scroll in order to force the rendering of all the contacts
        height = self.marionette.execute_script("return document.querySelector('[data-uuid]').clientHeight;")
        for idx in range(number_to_wait_for):
            self.marionette.execute_script("document.querySelector('{0}').scrollTop = {1}".
                                            format(self._group_container_selector, idx * height))

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

    def a11y_click_new_contact(self):
        self.accessibility.click(self.marionette.find_element(*self._new_contact_button_locator))
        from gaiatest.apps.contacts.regions.contact_form import NewContact
        new_contact = NewContact(self.marionette)
        new_contact.wait_for_new_contact_form_to_load()
        return new_contact

    def tap_settings(self):
        settings = self.marionette.find_element(*self._settings_button_locator)
        Wait(self.marionette).until(expected.element_displayed(settings))
        settings.tap()
        Wait(self.marionette).until(expected.element_not_displayed(settings))
        from gaiatest.apps.contacts.regions.settings_form import SettingsForm
        return SettingsForm(self.marionette)

    def tap_select_all(self):
        window_height = self.marionette.execute_script('return window.wrappedJSObject.innerHeight')
        wrapper = self.marionette.find_element(*self._select_all_wrapper_locator)
        Wait(self.marionette).until(lambda m: int(wrapper.size['height'] + wrapper.location['y']) == window_height)

        self.marionette.find_element(*self._select_all_button_locator).tap()

    def tap_export(self):
        self._tap_action_button()

    def tap_delete(self):
        self._tap_action_button()

    def _tap_action_button(self):
        # The same button is used to do bulk operations (like delete or export). The displayed string changes though.
        # Hence, let's define more semantically explicit functions.
        self.marionette.find_element(*self._select_action_button_locator).tap()

    def tap_confirm_delete(self):
        delete_button = Wait(self.marionette).until(expected.element_present(*self._confirm_delete_locator))
        Wait(self.marionette).until(expected.element_displayed(delete_button))
        delete_button.tap()

    @property
    def is_favorites_list_displayed(self):
        return self.marionette.find_element(*self._favorites_list_locator).is_displayed()

    @property
    def status_message(self):
        status = Wait(self.marionette).until(expected.element_present(
            *self._status_message_locator))
        Wait(self.marionette).until(expected.element_displayed(status))
        return status.text

    @property
    def is_no_contacts_message_displayed(self):
        return self.marionette.find_element(*self._no_contacts_message_locator).is_displayed()

    class Contact(PageRegion):

        _name_locator = (By.CSS_SELECTOR, 'bdi > strong')
        _full_name_locator = (By.CSS_SELECTOR, 'p.contact-text bdi')
        _image_locator = (By.CSS_SELECTOR, 'span[data-type="img"]')

        @property
        def name(self):
            return self.root_element.find_element(*self._name_locator).text

        @property
        def full_name(self):
            return self.root_element.find_element(*self._full_name_locator).text

        @property
        def image_data_group(self):
            return self.root_element.find_element(*self._image_locator).get_attribute('data-group')

        def tap(self, return_class='ContactDetails'):
            self.tap_element_from_system_app(
                self.root_element.find_element(*self._name_locator), add_statusbar_height=True)
            return self._return_class_from_tap(return_class)

        def a11y_click(self, return_class='ContactDetails'):
            self.accessibility.click(self.root_element)
            return self._return_class_from_tap(return_class)

        def _return_class_from_tap(self, return_class='ContactDetails'):
            if return_class == 'ContactDetails':
                Wait(self.marionette).until(lambda m: expected.element_not_displayed(self.root_element))
                from gaiatest.apps.contacts.regions.contact_details import ContactDetails
                return ContactDetails(self.marionette)
            elif return_class == 'EditContact':
                # This may seem superfluous but we can enter EditContact from Contacts, or from ActivityPicker
                Wait(self.marionette).until(lambda m: self.apps.displayed_app.name == Contacts.name)
                self.apps.switch_to_displayed_app()
                from gaiatest.apps.contacts.regions.contact_form import EditContact
                return EditContact(self.marionette)
            elif return_class == 'SelectContact':
                return None
            else:
                # We are using contacts picker in activity - after choosing, fall back to open app
                Wait(self.marionette).until(lambda m: self.apps.displayed_app.name != Contacts.name)
                self.apps.switch_to_displayed_app()
