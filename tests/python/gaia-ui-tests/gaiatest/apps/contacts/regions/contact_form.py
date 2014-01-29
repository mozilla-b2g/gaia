# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time

from marionette.by import By
from gaiatest.apps.base import Base


class ContactForm(Base):

    _given_name_locator = (By.ID, 'givenName')
    _family_name_locator = (By.ID, 'familyName')
    _phone_locator = (By.ID, 'number_0')
    _email_locator = (By.ID, 'email_0')
    _street_locator = (By.ID, 'streetAddress_0')
    _zip_code_locator = (By.ID, 'postalCode_0')
    _city_locator = (By.ID, 'locality_0')
    _country_locator = (By.ID, 'countryName_0')
    _comment_locator = (By.ID, 'note_0')

    _thumbnail_photo_locator = (By.ID, 'thumbnail-photo')

    @property
    def given_name(self):
        return self.marionette.find_element(*self._given_name_locator).text

    def type_given_name(self, value):
        element = self.marionette.find_element(*self._given_name_locator)
        element.clear()
        element.send_keys(value)

    @property
    def family_name(self):
        return self.marionette.find_element(*self._family_name_locator).text

    def type_family_name(self, value):
        element = self.marionette.find_element(*self._family_name_locator)
        element.clear()
        element.send_keys(value)

    @property
    def phone(self):
        return self.marionette.find_element(*self._phone_locator).text

    def type_phone(self, value):
        element = self.marionette.find_element(*self._phone_locator)
        element.clear()
        element.send_keys(value)

    @property
    def email(self):
        return self.marionette.find_element(*self._email_locator).text

    def type_email(self, value):
        element = self.marionette.find_element(*self._email_locator)
        element.clear()
        element.send_keys(value)

    @property
    def street(self):
        return self.marionette.find_element(*self._street_locator).text

    def type_street(self, value):
        element = self.marionette.find_element(*self._street_locator)
        element.clear()
        element.send_keys(value)

    @property
    def zip_code(self):
        return self.marionette.find_element(*self._zip_code_locator).text

    def type_zip_code(self, value):
        element = self.marionette.find_element(*self._zip_code_locator)
        element.clear()
        element.send_keys(value)

    @property
    def city(self):
        return self.marionette.find_element(*self._city_locator).text

    def type_city(self, value):
        element = self.marionette.find_element(*self._city_locator)
        element.clear()
        element.send_keys(value)

    @property
    def country(self):
        return self.marionette.find_element(*self._country_locator).text

    def type_country(self, value):
        element = self.marionette.find_element(*self._country_locator)
        element.clear()
        element.send_keys(value)

    @property
    def comment(self):
        return self.marionette.find_element(*self._comment_locator).text

    def type_comment(self, value):
        self.wait_for_element_displayed(*self._comment_locator)
        element = self.marionette.find_element(*self._comment_locator)
        element.clear()
        element.send_keys(value)

    @property
    def picture_style(self):
        return self.marionette.find_element(*self._thumbnail_photo_locator ).get_attribute('style')

    def tap_picture(self):
        self.marionette.find_element(*self._thumbnail_photo_locator).tap()
        from gaiatest.apps.system.regions.activities import Activities
        return Activities(self.marionette)

    def wait_for_image_to_load(self):
        self.wait_for_condition(lambda m: 'background-image' in self.picture_style)

class EditContact(ContactForm):

    _update_locator = (By.ID, 'save-button')
    _cancel_locator = (By.ID, 'cancel-edit')
    _delete_locator = (By.ID, 'delete-contact')
    _delete_form_locator = (By.ID, 'confirmation-message')
    _cancel_delete_locator = (By.CSS_SELECTOR, 'form#confirmation-message button:not(.danger)')
    _confirm_delete_locator = (By.CSS_SELECTOR, 'form#confirmation-message button.danger')

    def __init__(self, marionette):
        ContactForm.__init__(self, marionette)
        update = self.marionette.find_element(*self._update_locator)
        self.wait_for_condition(lambda m: update.location['y'] == 0)

    def tap_update(self):
        self.wait_for_update_button_enabled()
        self.marionette.find_element(*self._update_locator).tap()
        self.wait_for_element_not_displayed(*self._update_locator)
        from gaiatest.apps.contacts.regions.contact_details import ContactDetails
        return ContactDetails(self.marionette)

    def tap_cancel(self):
        self.marionette.find_element(*self._cancel_locator).tap()
        from gaiatest.apps.contacts.regions.contact_details import ContactDetails
        return ContactDetails(self.marionette)

    def tap_delete(self):
        delete_item = self.marionette.find_element(*self._delete_locator)
        # TODO Bug 875830 - Remove scrollIntoView() when bug resolved
        self.marionette.execute_script("arguments[0].scrollIntoView(false);", [delete_item])
        delete_item.tap()

    def tap_cancel_delete(self):
        self.wait_for_element_displayed(*self._delete_form_locator)
        self.marionette.find_element(*self._cancel_delete_locator).tap()

    def tap_confirm_delete(self):
        self.wait_for_element_displayed(*self._delete_form_locator)
        self.marionette.find_element(*self._confirm_delete_locator).tap()

    def wait_for_update_button_enabled(self):
        self.wait_for_condition(lambda m: self.marionette.find_element(*self._update_locator).is_enabled())


class NewContact(ContactForm):

    _done_button_locator = (By.ID, 'save-button')

    def __init__(self, marionette):
        ContactForm.__init__(self, marionette)
        done = self.marionette.find_element(*self._done_button_locator)
        self.wait_for_condition(lambda m: done.location['y'] == 0)

    def tap_done(self, return_contacts=True):
        # NewContact can be opened as an Activity from other apps. In this scenario we don't return Contacts
        self.marionette.find_element(*self._done_button_locator).tap()
        if return_contacts:
            self.wait_for_element_not_displayed(*self._done_button_locator)
            from gaiatest.apps.contacts.app import Contacts
            return Contacts(self.marionette)
        else:
            # Bug 947317 Marionette exception after tap closes a frame
            time.sleep(2)
