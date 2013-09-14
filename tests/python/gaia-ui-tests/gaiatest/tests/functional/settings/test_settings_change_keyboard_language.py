# -*- coding: UTF-8 -*-
# This is Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest import GaiaTestCase
from gaiatest.apps.settings.app import Settings
from gaiatest.apps.contacts.app import Contacts


class TestChangeKeyboardLanguage(GaiaTestCase):

    _language_key_locator = (By.CSS_SELECTOR, ".keyboard-row button[data-keycode='-3']")
    _special_key_locator = (By.CSS_SELECTOR, ".keyboard-row button[data-keycode='209']")
    _expected_key = u'\xd1'

    def test_change_keyboard_language_settings(self):
        settings = Settings(self.marionette)
        settings.launch()
        keyboard_settings = settings.open_keyboard_settings()

        # Select keyboard language
        keyboard_settings.select_language('spanish')

        # launch the Contacts app to verify the keyboard layout
        contacts_app = Contacts(self.marionette)
        contacts_app.launch()
        new_contact_form = contacts_app.tap_new_contact()
        new_contact_form.type_given_name('')

        # Switch to keyboard frame and switch language
        new_contact_form.keyboard.switch_to_keyboard()
        new_contact_form.keyboard.tap_keyboard_language_key()
        self.wait_for_element_displayed(*self._special_key_locator)
        special_key = self.marionette.find_element(*self._special_key_locator).text

        # Checking if exists the special key - "ñ"
        self.assertEqual(special_key, self._expected_key)
