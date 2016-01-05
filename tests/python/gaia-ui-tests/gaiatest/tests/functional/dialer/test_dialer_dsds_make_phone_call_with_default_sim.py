# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.marionette_test import parameterized

from gaiatest import GaiaTestCase
from gaiatest.apps.phone.app import Phone


class TestDialerDsdsMakePhoneCallWithDefaultSim(GaiaTestCase):

    @parameterized("1", 1)
    @parameterized("2", 2)
    def test_dialer_dsds_make_phone_call_with_default_sim(self, default_sim):
        """
        Place a phone call with the default SIM.
        """
        self.data_layer.set_setting('ril.telephony.defaultServiceId', default_sim - 1)
        remote_phone_number = self.testvars['remote_phone_number']

        phone = Phone(self.marionette)
        phone.launch()

        call_screen = phone.keypad.call_number(remote_phone_number)
        call_screen.wait_for_outgoing_call()

        self.assertIn(str(default_sim), call_screen.via_sim)
        call_screen.hang_up()

    def tearDown(self):
        # Switch back to main frame before Marionette loses track bug #840931
        self.marionette.switch_to_frame()

        # In case the assertion fails this will still kill the call
        # An open call creates problems for future tests
        self.data_layer.kill_active_call()

        GaiaTestCase.tearDown(self)
