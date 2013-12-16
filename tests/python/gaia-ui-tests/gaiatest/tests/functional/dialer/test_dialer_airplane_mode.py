# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.phone.app import Phone
from marionette.errors import JavascriptException


class TestDialerAirplaneMode(GaiaTestCase):

    def test_dialer_airplane_mode(self):
        # https://moztrap.mozilla.org/manage/case/2282/

        # Disable the device radio, enable Airplane mode
        self.data_layer.set_setting('airplaneMode.enabled', True)

        # Check that we are in Airplane mode
        self.assertTrue(self.data_layer.get_setting('airplaneMode.enabled'))

        # Launch the device dialer
        phone = Phone(self.marionette)
        phone.launch()

        # Make a call
        test_phone_number = self.testvars['remote_phone_number']
        phone.keypad.dial_phone_number(test_phone_number)
        phone.keypad.tap_call_button(switch_to_call_screen=False)

        # Check for the Airplane mode dialog
        phone.wait_for_confirmation_dialog()

        # Verify the correct dialog text for the case
        self.assertEqual("Airplane mode activated", phone.confirmation_dialog_text)

        # Verify that there is no active telephony state; window.navigator.mozTelephony.active is null
        self.assertRaises(JavascriptException, self.marionette.execute_script,
                          "return window.navigator.mozTelephony.active.state;")
