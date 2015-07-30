# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base


class ContactDetails(Base):

    _contact_name_title_locator = (By.ID, 'contact-name-title')
    _contact_image_locator = (By.ID, 'cover-img')
    _call_phone_number_button_locator = (By.ID, 'call-or-pick-0')
    _phone_numbers_locator = (By.CSS_SELECTOR, '#contact-detail-inner .icon-call')
    _send_sms_button_locator = (By.ID, 'send-sms-button-0')
    _edit_contact_button_locator = (By.ID, 'edit-contact-button')
    _details_header_locator = (By.ID, 'details-view-header')
    _add_remove_favorite_button_locator = (By.ID, 'toggle-favorite')
    _comments_locator = (By.ID, 'note-details-template-0')
    # Normally, (By.ID, 'link_button') should be used below,
    # but there are 2 elements with that ID in the document, see bug 1116758
    _facebook_link_locator = (By.CSS_SELECTOR, '#contact-detail-inner .icon-link')
    _confirm_unlink_button_locator = (By.CSS_SELECTOR, 'button[data-l10n-id="social-unlink-confirm-accept"]')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        el = self.marionette.find_element(*self._details_header_locator)
        Wait(self.marionette).until(lambda m: el.location['x'] == 0)

    @property
    def full_name(self):
        return self.marionette.find_element(*self._contact_name_title_locator).text

    @property
    def phone_number(self):
        return self.marionette.find_element(*self._call_phone_number_button_locator).text

    @property
    def phone_numbers(self):
        return [element.text for element in self.marionette.find_elements(*self._phone_numbers_locator)]

    @property
    def comments(self):
        return self.marionette.find_element(*self._comments_locator).text

    @property
    def image_style(self):
        return self.marionette.find_element(*self._contact_image_locator).get_attribute('style')

    def tap_phone_number(self):
        call = self.marionette.find_element(*self._call_phone_number_button_locator)
        Wait(self.marionette).until(expected.element_enabled(call))
        call.tap()
        from gaiatest.apps.phone.regions.call_screen import CallScreen
        return CallScreen(self.marionette)

    def tap_send_sms(self):
        self.marionette.find_element(*self._send_sms_button_locator).tap()
        from gaiatest.apps.messages.regions.new_message import NewMessage
        return NewMessage(self.marionette)

    def tap_link_contact(self):
        facebook_link_button = Wait(self.marionette).until(expected.element_present(*self._facebook_link_locator))
        Wait(self.marionette).until(expected.element_displayed(facebook_link_button))
        facebook_link_button.tap()
        from gaiatest.apps.system.regions.facebook import FacebookLogin
        return FacebookLogin(self.marionette)

    def tap_unlink_contact(self):
        facebook_unlink_button = Wait(self.marionette).until(expected.element_present(*self._facebook_link_locator))
        Wait(self.marionette).until(expected.element_displayed(facebook_unlink_button))
        facebook_unlink_button.tap()

        facebook_confirm_unlink_button = Wait(self.marionette).until(expected.element_present(*self._confirm_unlink_button_locator))
        Wait(self.marionette).until(expected.element_displayed(facebook_confirm_unlink_button))
        facebook_confirm_unlink_button.tap()
        self.apps.switch_to_displayed_app()

    def tap_edit(self):
        edit = Wait(self.marionette).until(expected.element_present(
            *self._edit_contact_button_locator))
        Wait(self.marionette).until(expected.element_displayed(edit))
        edit.tap()
        Wait(self.marionette).until(expected.element_not_displayed(edit))
        from gaiatest.apps.contacts.regions.contact_form import EditContact
        return EditContact(self.marionette)

    def a11y_click_edit(self):
        edit = Wait(self.marionette).until(expected.element_present(
            *self._edit_contact_button_locator))
        Wait(self.marionette).until(expected.element_displayed(edit))
        self.accessibility.click(edit)
        from gaiatest.apps.contacts.regions.contact_form import EditContact
        return EditContact(self.marionette)

    def tap_back(self):
        el = self.marionette.find_element(*self._details_header_locator)
        Wait(self.marionette).until(expected.element_displayed(el))
        # TODO: remove tap with coordinates after Bug 1061698 is fixed
        el.tap(25, 25)
        Wait(self.marionette).until(expected.element_not_displayed(el))
        from gaiatest.apps.contacts.app import Contacts
        return Contacts(self.marionette)

    def tap_add_remove_favorite(self):
        button = self.marionette.find_element(*self._add_remove_favorite_button_locator)
        # Capture the current state of the element
        initial_state = button.get_attribute('data-l10n-id')
        self.marionette.execute_script("arguments[0].scrollIntoView(false);", [button])
        button.tap()
        # Wait for it to have toggled
        Wait(self.marionette).until(lambda m: button.get_attribute('data-l10n-id') != initial_state)

    @property
    def add_remove_text(self):
        return self.marionette.find_element(*self._add_remove_favorite_button_locator).text
