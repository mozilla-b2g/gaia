# -*- coding: utf-8 -*-
# This is Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest import GaiaTestCase
from gaiatest.apps.settings.app import Settings
from gaiatest.apps.contacts.app import Contacts


class TestChangeKeyboardLanguage(GaiaTestCase):

    _special_key_locator = (By.CSS_SELECTOR, ".keyboard-row button[data-keycode='209']")
    _expected_key = u'\xd1'

    def test_change_keyboard_language_settings(self):
        settings = Settings(self.marionette)
        settings.launch()
        keyboard_settings = settings.open_keyboard_settings()

        # Tap on active keyboard link
        select_keyboard = keyboard_settings.tap_selected_keyboards()

        # Tap 'add more keyboards' button
        add_more_keyboards = select_keyboard.tap_add_more_keyboards()

        # Select keyboard language
        add_more_keyboards.select_language(u'Espa\u00F1ol')
        add_more_keyboards.go_back()

        # launch the Contacts app to verify the keyboard layout
        contacts_app = Contacts(self.marionette)
        contacts_app.launch()
        new_contact_form = contacts_app.tap_new_contact()
        new_contact_form.type_given_name('')
        self.wait_for_condition(lambda m: new_contact_form.keyboard.is_displayed())

        # Switch to keyboard frame and switch language
        new_contact_form.keyboard.tap_keyboard_language_key()
        new_contact_form.keyboard.switch_to_keyboard()
        special_key = self.marionette.find_element(*self._special_key_locator).text

        # Checking if exists the special key - "ñ"
        self.assertEqual(special_key, self._expected_key)
