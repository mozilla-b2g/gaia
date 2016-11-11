# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.base import Base


class ContactDetails(Base):

    _contact_name_title_locator = (By.ID, 'contact-name-title')
    _contact_image_locator = (By.ID, 'cover-img')
    _call_phone_number_button_locator = (By.ID, 'call-or-pick-0')
    _send_sms_button_locator = (By.ID, 'send-sms-button-0')
    _edit_contact_button_locator = (By.ID, 'edit-contact-button')
    _back_button_locator = (By.ID, 'details-back')
    _add_remove_favorite_button_locator = (By.ID, 'toggle-favorite')
    _comments_locator = (By.ID, 'note-details-template-0')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        self.wait_for_condition(lambda m: m.find_element(*self._contact_name_title_locator).location['x'] == 0)

    @property
    def full_name(self):
        return self.marionette.find_element(*self._contact_name_title_locator).text

    @property
    def phone_number(self):
        return self.marionette.find_element(*self._call_phone_number_button_locator).text

    @property
    def comments(self):
        return self.marionette.find_element(*self._comments_locator).text

    @property
    def image_style(self):
        return self.marionette.find_element(*self._contact_image_locator).get_attribute('style')

    def tap_phone_number(self):
        self.marionette.find_element(*self._call_phone_number_button_locator).tap()
        from gaiatest.apps.phone.regions.call_screen import CallScreen
        return CallScreen(self.marionette)

    def tap_send_sms(self):
        self.marionette.find_element(*self._send_sms_button_locator).tap()
        from gaiatest.apps.messages.regions.new_message import NewMessage
        return NewMessage(self.marionette)

    def tap_edit(self):
        self.wait_for_element_displayed(*self._edit_contact_button_locator)
        self.marionette.find_element(*self._edit_contact_button_locator).tap()
        from gaiatest.apps.contacts.regions.contact_form import EditContact
        return EditContact(self.marionette)

    def tap_back(self):
        self.marionette.find_element(*self._back_button_locator).tap()
        from gaiatest.apps.contacts.app import Contacts
        return Contacts(self.marionette)

    def tap_add_remove_favorite(self):
        button = self.marionette.find_element(*self._add_remove_favorite_button_locator)
        self.marionette.execute_script("arguments[0].scrollIntoView(false);", [button])
        button.tap()

    @property
    def add_remove_text(self):
        return self.marionette.find_element(*self._add_remove_favorite_button_locator).text
