# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.mocks.mock_contact import MockContact

from marionette.errors import NoSuchElementException


class TestContacts(GaiaTestCase):

    _loading_overlay = ('id', 'loading-overlay')

    _sms_app_iframe_locator = ('css selector', 'iframe[src="app://sms.gaiamobile.org/index.html"]')

    # Contact details panel
    _send_sms_button_locator = ('id', 'send-sms-button-0')

    #SMS app locators
    _sms_app_header_locator = ('id', 'header-text')
    _contact_carrier_locator = ('id', 'contact-carrier')

    def setUp(self):
        GaiaTestCase.setUp(self)

        self.contact = MockContact()
        self.data_layer.insert_contact(self.contact)

        # launch the Contacts app
        self.app = self.apps.launch('Contacts')
        self.wait_for_element_not_displayed(*self._loading_overlay)

    def create_contact_locator(self, contact):
        return ('xpath', "//a[descendant::strong[text()='%s']]" % contact)

    def test_sms_contact(self):
        # https://moztrap.mozilla.org/manage/case/1314/
        # Setup a text message from a contact

        contact_locator = self.create_contact_locator(self.contact['givenName'])
        self.wait_for_element_displayed(*contact_locator)

        contact_listing = self.marionette.find_element(*contact_locator)
        self.marionette.tap(contact_listing)

        self.wait_for_element_present(*self._send_sms_button_locator)
        send_sms_button = self.marionette.find_element(*self._send_sms_button_locator)
        self.marionette.tap(send_sms_button)

        self.marionette.switch_to_frame()

        sms_iframe = self.marionette.find_element(*self._sms_app_iframe_locator)
        self.marionette.switch_to_frame(sms_iframe)

        self.wait_for_condition(
            lambda m: m.find_element(*self._contact_carrier_locator).text != "Carrier unknown")

        header_element = self.marionette.find_element(*self._sms_app_header_locator)
        expected_name = self.contact['givenName'] + " " + self.contact['familyName']
        expected_tel = self.contact['tel']['value']

        self.assertEqual(header_element.text, expected_name)
        self.assertEqual(header_element.get_attribute('data-phone-number'),
                         expected_tel)
