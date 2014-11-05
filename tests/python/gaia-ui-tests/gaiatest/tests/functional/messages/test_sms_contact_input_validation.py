# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time

from gaiatest import GaiaTestCase
from gaiatest.apps.messages.app import Messages


class TestContactValidation(GaiaTestCase):

    def test_sms_contact_validation(self):

        self.messages = Messages(self.marionette)
        self.messages.launch()

        new_message = self.messages.tap_create_new_message()
        keyboard = new_message.tap_recipient_section()
        keyboard.send('test_contact')
        keyboard.tap_enter()

        # Verify if recipient is invalid and uneditable
        self.assertIn('invalid', new_message.recipient_css_class)
        self.assertTrue(new_message.is_recipient_name_editable == 'false')

        new_message.tap_recipient_name()

        self.assertTrue(new_message.is_recipient_name_editable == 'true')

        # Type_message will tap in the field to focus it
        new_message.type_message('Test message')

        self.assertFalse(new_message.is_send_button_enabled)
