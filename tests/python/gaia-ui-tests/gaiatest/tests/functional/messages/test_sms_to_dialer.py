# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time
from gaiatest import GaiaTestCase
from gaiatest.apps.messages.app import Messages
from gaiatest.apps.system.app import System


class TestDialerFromMessage(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

    def test_dialer_from_message(self):

        # Send a SMS to the device
        _text_message_content = "Automated Test %s" % str(time.time())

        # Open first received message
        self.messages = Messages(self.marionette)
        self.messages.launch()

        self.data_layer.send_sms(self.environment.phone_numbers[0], _text_message_content)
        self.apps.switch_to_displayed_app()

        self.messages.wait_for_message_received(timeout=180)

        # Sometimes tap is done on the notification instead of message header
        self.marionette.switch_to_frame()
        system = System(self.marionette)
        system.wait_for_notification_toaster_not_displayed()

        self.apps.switch_to_displayed_app()
        message_thread = self.messages.tap_first_received_message()

        # Check the phone number
        keypad = message_thread.tap_call()
        self.assertEquals(keypad.phone_number, self.environment.phone_numbers[0])
