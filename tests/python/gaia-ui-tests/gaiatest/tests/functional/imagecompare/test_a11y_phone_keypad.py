# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest import GaiaTestCase
from gaiatest.mocks.mock_contact import MockContact
from gaiatest.apps.phone.app import Phone

from gaiatest.utils.Imagecompare.imagecompare_util import ImageCompareUtil
import sys,time

class TestAccessibilityPhoneKeypad(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.contact = MockContact()

        self.phone = Phone(self.marionette)
        self.phone.launch()

        current_module = str(sys.modules[__name__])
        self.module_name = current_module[current_module.find("'")+1:current_module.find("' from")]
        self.graphics = ImageCompareUtil(self.marionette,self.apps,self, '.')

    def test_phone_keypad(self):

        # Delete is hidden from the screen reader.
        self.assertTrue(self.accessibility.is_hidden(self.marionette.find_element(
            *self.phone.keypad._keypad_delete_locator)))
        # Add contact button is disabled for the screen reader.
        self.assertTrue(self.accessibility.is_disabled(self.marionette.find_element(
            *self.phone.keypad._add_new_contact_button_locator)))

        self.graphics.invoke_screen_capture()

        number_to_verify = self.contact['tel']['value']

        # Screen reader dial number
        self.phone.keypad.a11y_dial_phone_number(number_to_verify)

        # Check that the number was entered correctly.
        self.assertEqual(self.phone.keypad.phone_number, number_to_verify)
        # Delete is visible to the screen reader.
        self.assertFalse(self.accessibility.is_hidden(self.marionette.find_element(
            *self.phone.keypad._keypad_delete_locator)))
        # Call button is enabled for the screen reader.
        self.assertFalse(self.accessibility.is_disabled(self.marionette.find_element(
            *self.phone.keypad._call_bar_locator)))
        # Add contact button is enabled for the screen reader.
        self.assertFalse(self.accessibility.is_disabled(self.marionette.find_element(
            *self.phone.keypad._add_new_contact_button_locator)))


    def tearDown(self):

        # In case the assertion fails this will still kill the call
        # An open call creates problems for future tests
        self.graphics.execute_image_job(self)

        GaiaTestCase.tearDown()