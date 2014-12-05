# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.phone.app import Phone


class TestPlace40PhoneCallsSequentially(GaiaTestCase):

    def test_place_40_phone_calls_sequentially(self):
        # In bug 1074379 and bug 1081714, we saw a regression that hid the phone
        # number after placing 25 phones calls.
        # This test is here to catch this regression one more time.

        NUMBER_OF_PHONE_CALLS = 40
        remote_phone_number = self.testvars['remote_phone_number']

        phone = Phone(self.marionette)
        phone.launch()

        call_screen = phone.keypad.call_number(remote_phone_number)
        call_screen.wait_for_outgoing_call()
        call_screen.hang_up()

        for i in range(NUMBER_OF_PHONE_CALLS):
            print 'Placing {}/{} phone call'.format(i+1, NUMBER_OF_PHONE_CALLS)
            call_screen = phone.keypad.redial()
            call_screen.wait_for_outgoing_call()
            call_screen.hang_up()

    def tearDown(self):
        # Switch back to main frame before Marionette loses track bug #840931
        self.marionette.switch_to_frame()

        # In case an assertion fails this will still kill the call
        # An open call creates problems for future tests
        self.data_layer.kill_active_call()

        GaiaTestCase.tearDown(self)
