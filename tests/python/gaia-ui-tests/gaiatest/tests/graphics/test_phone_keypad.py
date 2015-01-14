# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest.mocks.mock_contact import MockContact
from gaiatest.apps.phone.app import Phone
from gaiatest.gaia_graphics_test import GaiaImageCompareTestCase


class TestAccessibilityPhoneKeypad(GaiaImageCompareTestCase):

    def setUp(self):
        GaiaImageCompareTestCase.setUp(self)
        self.contact = MockContact()

        self.phone = Phone(self.marionette)
        self.phone.launch()

    def test_phone_keypad(self):

        # Delete is hidden from the screen reader.
        self.assertTrue(self.accessibility.is_hidden(self.marionette.find_element(
            *self.phone.keypad._keypad_delete_locator)))
        # Add contact button is disabled for the screen reader.
        self.assertTrue(self.accessibility.is_disabled(self.marionette.find_element(
            *self.phone.keypad._add_new_contact_button_locator)))

        self.take_screenshot()

        number_to_verify = '1234567890'

        # Screen reader dial number
        self.phone.keypad.a11y_dial_phone_number(number_to_verify)

        # Check that the number was entered correctly.
        self.take_screenshot()
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
