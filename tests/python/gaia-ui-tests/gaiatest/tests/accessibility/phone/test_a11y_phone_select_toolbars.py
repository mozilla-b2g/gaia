# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest import GaiaTestCase
from gaiatest.apps.phone.app import Phone


class TestAccessibilityPhoneSelectToolbars(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.phone = Phone(self.marionette)
        self.phone.launch()

    def test_phone_select_toolbars(self):

        # Screen reader activated call log button click.
        call_log = self.phone.a11y_click_call_log_toolbar_button()

        # Keypad is hidden from the screen reader.
        self.assertTrue(self.accessibility.is_hidden(self.marionette.find_element(
            *self.phone._keypad_toolbar_locator)))
        # Contacts is hidden from the screen reader.
        self.assertTrue(self.accessibility.is_hidden(self.marionette.find_element(
            *self.phone._contacts_toolbar_locator)))
        # Call log is visible to the screen reader.
        self.assertTrue(self.accessibility.is_visible(self.marionette.find_element(
            *self.phone._call_log_toolbar_locator)))

        # Screen reader activated contacts button click.
        self.phone.a11y_click_contacts()
        self.apps.switch_to_displayed_app()

        # Keypad is hidden from the screen reader.
        self.assertTrue(self.accessibility.is_hidden(self.marionette.find_element(
            *self.phone._keypad_toolbar_locator)))
        # Contacts is visible to the screen reader.
        self.assertTrue(self.accessibility.is_visible(self.marionette.find_element(
            *self.phone._contacts_toolbar_locator)))
        # Call log is hidden from the screen reader.
        self.assertTrue(self.accessibility.is_hidden(self.marionette.find_element(
            *self.phone._call_log_toolbar_locator)))

        # Screen reader activated keypad button click.
        self.phone.a11y_click_keypad_toolbar_button()

        # Keypad is visible to the screen reader.
        self.assertTrue(self.accessibility.is_visible(self.marionette.find_element(
            *self.phone._keypad_toolbar_locator)))
        # Contacts is hidden from the screen reader.
        self.assertTrue(self.accessibility.is_hidden(self.marionette.find_element(
            *self.phone._contacts_toolbar_locator)))
        # Call log is hidden from the screen reader.
        self.assertTrue(self.accessibility.is_hidden(self.marionette.find_element(
            *self.phone._call_log_toolbar_locator)))
