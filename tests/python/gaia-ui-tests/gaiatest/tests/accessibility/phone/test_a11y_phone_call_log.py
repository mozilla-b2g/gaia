# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest import GaiaTestCase
from gaiatest.mocks.mock_contact import MockContact
from gaiatest.apps.phone.app import Phone


class TestAccessibilityPhoneCallLog(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.contact = MockContact()

        self.phone = Phone(self.marionette)
        self.phone.launch()

    def test_phone_call_log(self):

        # Screen reader activated call log button click.
        call_log = self.phone.a11y_click_call_log_toolbar_button()

        # Edit call log button is disabled for the screen reader.
        self.assertTrue(self.accessibility.is_disabled(self.marionette.find_element(
            *call_log._call_log_edit_button_locator)))

        # Screen reader activated keypad button click.
        self.phone.a11y_click_keypad_toolbar_button()

        test_phone_number = self.contact['tel']['value']

        # Make a call so it will appear in the call log
        self.phone.a11y_make_call_and_hang_up(test_phone_number)

        # Wait for fall back to phone app
        self.wait_for_condition(lambda m: self.apps.displayed_app.name == self.phone.name)
        self.apps.switch_to_displayed_app()
        self.phone.a11y_click_call_log_toolbar_button()

        # Edit call log button is enabled for the screen reader.
        self.assertFalse(self.accessibility.is_disabled(self.marionette.find_element(
            *call_log._call_log_edit_button_locator)))

        # Now check that one call appears in the call log
        self.assertEqual(call_log.all_calls_count, 1)
        # Check that the call displayed is for the call we made
        self.assertIn(test_phone_number, call_log.first_all_call_text)

        call_log_first_item = self.marionette.find_elements(
            *call_log._all_calls_list_item_button_locator)[0]

        # This needs to be uncommented once the screen reader can handle long press.
        # Activate a first log item with the screen reader.
        # self.accessibility.click(call_log_first_item)

        # # Add contact action menu should be visible to the screen reader.
        # self.assertFalse(self.accessibility.is_hidden(self.marionette.find_element(
        #     *self.phone._add_contact_action_menu_locator)))

        # # Close the add contact action menu with the screen reader.
        # self.accessibility.click(self.marionette.find_element(
        #     *self.phone._cancel_action_menu_locator))

        self.accessibility.click(self.marionette.find_element(
            *call_log._call_log_edit_button_locator))

        call_log_edit_element = self.marionette.find_element(
            *call_log._call_log_edit_dialog_locator)
        delete = self.marionette.find_element(*call_log._call_log_edit_delete_button_locator)
        deselect = self.marionette.find_element(
            *call_log._call_log_edit_deselect_all_button_locator)
        select = self.marionette.find_element(*call_log._call_log_edit_select_all_button_locator)

        # Edit mode is visible to the screen reader.
        self.assertFalse(self.accessibility.is_hidden(call_log_edit_element))
        # Delete button is disabled for the screen reader.
        self.assertTrue(self.accessibility.is_disabled(delete))
        # Deselect all button is disabled for the screen reader.
        self.assertTrue(self.accessibility.is_disabled(deselect))
        # Select all button is enabled for the screen reader.
        self.assertFalse(self.accessibility.is_disabled(select))

        # Activate a first log item with the screen reader.
        call_log_first_item = self.marionette.find_elements(
            *call_log._all_calls_list_item_checkbox_locator)[0]
        self.accessibility.click(call_log_first_item)

        # Delete button is now enabled for the screen reader.
        self.assertFalse(self.accessibility.is_disabled(delete))
        # Deselect all button is now enabled for the screen reader.
        self.assertFalse(self.accessibility.is_disabled(deselect))
        # Select all button is now disabled for the screen reader.
        self.assertTrue(self.accessibility.is_disabled(select))
        # First item in the list is selected.
        self.assertTrue(call_log_first_item.get_attribute('checked'))

        self.accessibility.click(call_log_first_item)
        # First item in the list is unchecked.
        self.assertFalse(call_log_first_item.get_attribute('checked'))

        self.accessibility.click(self.marionette.find_element(
            *call_log._call_log_edit_close_button_locator))

        # Edit mode is hidden from the screen reader.
        self.assertTrue(self.accessibility.is_hidden(call_log_edit_element))
