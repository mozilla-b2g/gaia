# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time
from gaiatest import GaiaTestCase
from gaiatest.apps.messages.app import Messages


class TestDialerFromMessage(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

    def test_dialer_from_message(self):

        # Send a SMS to the device
        _text_message_content = "Automated Test %s" % str(time.time())

        self.data_layer.send_sms(self.testvars['carrier']['phone_number'], _text_message_content)

        # Open first received message
        self.messages = Messages(self.marionette)
        self.messages.launch()
        self.messages.wait_for_message_received(timeout=180)
        self.message_thread = self.messages.tap_first_received_message()

        # Check the phone number
        self.message_thread.tap_header()
        keypad = self.message_thread.tap_call()
        self.assertEquals(keypad.phone_number, self.testvars['carrier']['phone_number'])
