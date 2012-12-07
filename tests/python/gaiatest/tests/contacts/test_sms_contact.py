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

    def setUp(self):

        GaiaTestCase.setUp(self)

        self.lockscreen.unlock()

        # launch the Contacts app
        self.app = self.apps.launch('Contacts')
        self.wait_for_element_not_displayed(*self._loading_overlay)

        self.contact = MockContact()
        self.data_layer.insert_contact(self.contact)
        self.marionette.refresh()

    def create_contact_locator(self, contact):
        return ('xpath', "//a[descendant::strong[text()='%s']]" % contact)

    def test_sms_contact(self):
        # https://moztrap.mozilla.org/manage/case/1314/
        # Setup a text message from a contact

        contact_locator = self.create_contact_locator(self.contact['givenName'])
        self.wait_for_element_displayed(*contact_locator)

        self.marionette.find_element(*contact_locator).click()

        self.wait_for_element_present(*self._send_sms_button_locator)
        self.marionette.find_element(*self._send_sms_button_locator).click()

        self.marionette.switch_to_frame()

        sms_iframe = self.marionette.find_element(*self._sms_app_iframe_locator)
        self.marionette.switch_to_frame(sms_iframe)

        self.wait_for_element_displayed(*self._sms_app_header_locator)

        header_element = self.marionette.find_element(*self._sms_app_header_locator)
        expected_name = self.contact['givenName'] + " " + self.contact['familyName']
        expected_tel = self.contact['tel']['value']

        self.assertEqual(header_element.text, expected_name)
        self.assertEqual(header_element.get_attribute('data-phone-number'),
                         expected_tel)

    def tearDown(self):

        if hasattr(self, 'contact'):
            # Have to switch back to Contacts frame to remove the contact
            self.marionette.switch_to_frame()
            self.marionette.switch_to_frame(self.app.frame_id)
            self.data_layer.remove_contact(self.contact)

        # close all apps
        self.apps.kill_all()
