# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time
from gaiatest import GaiaTestCase
from gaiatest.apps.messages.app import Messages


class TestDialerFromMessage(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

        # Launch the SMS app
        self.messages = Messages(self.marionette)
        self.messages.launch()

    def test_dialer_from_message(self):

        # Send a SMS to the device
        _text_message_content = "Automated Test %s" % str(time.time())

        # Tap new message
        new_message = self.messages.tap_create_new_message()
        new_message.type_phone_number(self.testvars['carrier']['phone_number'])

        new_message.type_message(_text_message_content)

        # Tap send
        self.message_thread = new_message.tap_send()
        self.message_thread.tap_header()
        keypad = self.message_thread.tap_call()
        self.assertEquals(keypad.phone_number, self.testvars['carrier']['phone_number'])
