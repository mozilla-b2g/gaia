# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.messages.app import Messages


class TestSMSContactInput(GaiaTestCase):

    def test_sms_semicolon_completes_the_entered_recipient(self):
        """
            https://moztrap.mozilla.org/manage/case/10925/
        """

        self.messages = Messages(self.marionette)
        self.messages.launch()

        new_message = self.messages.tap_create_new_message()

        from gaiatest.apps.keyboard.app import Keyboard
        keyboard = Keyboard(self.marionette)

        keyboard.send('074')
        keyboard.send(';')

        # Verify if recipient is valid and uneditable
        self.assertNotIn('invalid', new_message.recipient_css_class)
        self.assertTrue(new_message.is_recipient_name_editable == 'false')

        keyboard.send('777')
        keyboard.send(';')

        self.assertEqual(new_message.number_of_recipients, 2)
        new_message.tap_message()
        self.assertEqual(new_message.number_of_recipients, 2)

        self.marionette.switch_to_frame()
        self.assertTrue(new_message.keyboard.is_keyboard_displayed)
