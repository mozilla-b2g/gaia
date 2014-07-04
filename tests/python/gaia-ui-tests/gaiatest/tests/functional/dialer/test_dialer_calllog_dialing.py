# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
import time

from gaiatest import GaiaTestCase
from gaiatest.apps.phone.app import Phone


class TestDialerCalllogDialing(GaiaTestCase):

    def test_dialer_add_contact(self):

        test_phone_number = self.testvars['sim1']['phone_number']

        # launch the Phone app
        phone = Phone(self.marionette)
        phone.launch()

        # Put number in keypad
        call_screen = phone.keypad.call_number(test_phone_number)

        # Hang up call
        call_screen.hang_up()

        # Go to call log
        self.apps.switch_to_displayed_app()

        # Tap the call log tab
        call_log = phone.tap_call_log_toolbar_button()

        # Tap the all tab
        call_log.tap_all_calls_tab()

        # Tap the first phone number
        call_log.tap_all_first_number()
        
        # Wait       
        time.sleep(5)

        # Check if the call is made, value is not null
        self.assertEqual(self.data_layer.active_telephony_state, "alerting")

        # Hang up call
        self.data_layer.kill_active_call()

