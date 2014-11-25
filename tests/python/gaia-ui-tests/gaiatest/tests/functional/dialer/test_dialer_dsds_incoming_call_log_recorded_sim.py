# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.phone.app import Phone
from gaiatest.apps.phone.regions.call_screen import CallScreen

from marionette.wait import Wait
from marionette.marionette_test import parameterized


class TestDsdsOutgoingCallLogRecordedSim(GaiaTestCase):

    @parameterized('1', 0)
    @parameterized('2', 1)
    def test_dsds_outgoing_call_log_recorded_sim(self, sim_value):
        """
        Miss a call on one SIM.
        Check which SIM was involved in the call on the call log.
        """
        PLIVO_TIMEOUT = 30

        from gaiatest.utils.plivo.plivo_util import PlivoUtil
        self.plivo = PlivoUtil(
            self.testvars['plivo']['auth_id'],
            self.testvars['plivo']['auth_token'],
            self.testvars['plivo']['phone_number']
        )
        self.call_uuid = self.plivo.make_call(
            to_number=self.testvars['local_phone_numbers'][sim_value].replace('+', ''),
            timeout=PLIVO_TIMEOUT)

        call_screen = CallScreen(self.marionette)
        call_screen.wait_for_incoming_call_with_locked_screen()
        self.plivo.hangup_call(self.call_uuid)

        Wait(self.plivo, timeout=PLIVO_TIMEOUT).until(
            lambda p: p.is_call_completed(self.call_uuid),
            message="Plivo didn't report the call as completed")
        self.call_uuid = None

        self.phone = Phone(self.marionette)
        self.phone.launch()

        call_log = self.phone.tap_call_log_toolbar_button()
        call_log.tap_all_calls_tab()
        self.assertTrue(call_log.call_list[0].is_sim_recorded(sim_value))

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
