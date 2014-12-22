# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.phone.regions.call_screen import CallScreen
from gaiatest.utils.plivo.plivo_util import PlivoUtil


class TestDialer(GaiaTestCase):

    def test_remote_phone_receives_dtmf_tones(self):
        """
        Inspired from https://moztrap.mozilla.org/manage/case/6076/
        """

        test_phone_number = self.testvars['plivo']['phone_number']
        self.plivo = PlivoUtil(
            self.testvars['plivo']['auth_id'],
            self.testvars['plivo']['auth_token'],
            test_phone_number
        )

        digits = '1234567890*#'

        self.call_uuid = self.plivo.make_call(
            to_number=self.testvars['local_phone_numbers'][0].replace('+', ''),
            answer_file_name='get_12_digits'
        )

        call_screen = CallScreen(self.marionette)
        call_screen.wait_for_incoming_call()
        call_screen.answer_call()
        self.plivo.wait_for_call_connected(self.call_uuid)

        in_call_keypad = call_screen.tap_open_keypad()
        in_call_keypad.dial_phone_number(digits)

        call_screen.in_call_keypad_hang_up()
        self.plivo.wait_for_call_completed(self.call_uuid)

        self.assertEqual(self.plivo.get_digits_for(self.call_uuid), digits)

    def tearDown(self):
        if self.call_uuid:
            self.plivo.clean_digits(self.call_uuid)
            self.plivo.hangup_call(self.call_uuid)

        # Switch back to main frame before Marionette loses track bug #840931
        self.marionette.switch_to_frame()
        self.data_layer.kill_active_call()

        GaiaTestCase.tearDown(self)
