# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette import SkipTest
from marionette.marionette_test import parameterized
from marionette_driver import Wait

from gaiatest import GaiaTestCase
from gaiatest.apps.phone.regions.call_screen import CallScreen


class TestDsdsReceiveCallOnBothSims(GaiaTestCase):

    def setUp(self):
        try:
            self.testvars['plivo']
        except KeyError:
            raise SkipTest('Plivo account details not present in test variables')

        GaiaTestCase.setUp(self)

    @parameterized("1", 0, 'SIM1')
    @parameterized("2", 1, 'SIM2')
    def test_dsds_receive_call_on_both_sims(self, sim_value, sim_name):
        """Make a phone call from Plivo to each SIM."""

        from gaiatest.utils.plivo.plivo_util import PlivoUtil
        self.plivo = PlivoUtil(
            self.testvars['plivo']['auth_id'],
            self.testvars['plivo']['auth_token'],
            self.testvars['plivo']['phone_number']
        )
        self.call_uuid = self.plivo.make_call(
            to_number=self.environment.phone_numbers[sim_value].replace('+', ''))

        call_screen = CallScreen(self.marionette)
        call_screen.wait_for_incoming_call()

        # TODO Replace the following line by a check on the l10n ID
        # once bug 1104667 lands
        self.assertTrue(sim_name in call_screen.incoming_via_sim)

        call_screen.answer_call()
        self.plivo.wait_for_call_connected(self.call_uuid)
        Wait(self.marionette).until(lambda m: self.data_layer.active_telephony_state == 'connected')

        # TODO Replace the following line by a check on the l10n ID
        # once bug 1104667 lands
        self.assertTrue(sim_name in call_screen.incoming_via_sim)

        call_screen.hang_up()
        self.plivo.wait_for_call_completed(self.call_uuid)
        self.call_uuid = None

    def tearDown(self):
        # Switch back to main frame before Marionette loses track bug #840931
        self.marionette.switch_to_frame()

        # In case an assertion fails this will still kill the call
        # An open call creates problems for future tests
        self.data_layer.kill_active_call()

        # Also ask Plivo to kill the call if needed
        if self.call_uuid:
            self.plivo.hangup_call(self.call_uuid)

        GaiaTestCase.tearDown(self)
