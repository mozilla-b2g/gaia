# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase

from gaiatest.mocks.mock_contact import MockContact


class TestContacts(GaiaTestCase):

    _loading_overlay = ('id', 'loading-overlay')

    # Header buttons
    _add_new_contact_button_locator = ('id', 'add-contact-button')
    _done_button_locator = ('id', 'save-button')

    # New/Edit contact fields
    _given_name_field_locator = ('id', 'givenName')
    _family_name_field_locator = ('id', 'familyName')
    _email_field_locator = ('id', "email_0")
    _phone_field_locator = ('id', "number_0")
    _street_field_locator = ('id', "streetAddress_0")
    _zip_code_field_locator = ('id', "postalCode_0")
    _city_field_locator = ('id', 'locality_0')
    _country_field_locator = ('id', 'countryName_0')
    _comment_field_locator = ('id', 'note_0')

    def setUp(self):
        GaiaTestCase.setUp(self)

        # launch the Contacts app
        self.app = self.apps.launch('Contacts')
        self.wait_for_element_not_displayed(*self._loading_overlay)

        self.contact = MockContact()

    def create_contact_locator(self, contact):
        return ('xpath', "//a[descendant::strong[text()='%s']]" % contact)

    def test_add_new_contact(self):
        # https://moztrap.mozilla.org/manage/case/1309/
        #click Create new contact

        self.wait_for_element_displayed(*self._add_new_contact_button_locator)
        add_new_contact = self.marionette.find_element(*self._add_new_contact_button_locator)
        self.marionette.tap(add_new_contact)

        self.wait_for_element_displayed(*self._given_name_field_locator)

        # Enter data into fields
        self.marionette.find_element(*self._given_name_field_locator).send_keys(self.contact['givenName'])
        self.marionette.find_element(*self._family_name_field_locator).send_keys(self.contact['familyName'])

        self.marionette.find_element(
            *self._phone_field_locator).send_keys(self.contact['tel']['value'])
        self.marionette.find_element(
            *self._email_field_locator).send_keys(self.contact['email'])

        self.marionette.find_element(
            *self._street_field_locator).send_keys(self.contact['street'])
        self.marionette.find_element(
            *self._zip_code_field_locator).send_keys(self.contact['zip'])
        self.marionette.find_element(
            *self._city_field_locator).send_keys(self.contact['city'])
        self.marionette.find_element(
            *self._country_field_locator).send_keys(self.contact['country'])

        self.marionette.find_element(
            *self._comment_field_locator).send_keys(self.contact['comment'])

        done_button = self.marionette.find_element(*self._done_button_locator)
        self.marionette.tap(done_button)

        contact_locator = self.create_contact_locator(self.contact['givenName'])
        self.wait_for_element_displayed(*contact_locator)
