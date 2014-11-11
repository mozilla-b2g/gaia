# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.phone.app import Phone
from gaiatest.apps.phone.regions.call_screen import CallScreen

from marionette import SkipTest
from marionette.wait import Wait


class TestDsdsCallLogSimInvolved(GaiaTestCase):

    def setUp(self):

        try:
            self.testvars['plivo']
        except KeyError:
            raise SkipTest('Plivo account details not present in test variables')

        GaiaTestCase.setUp(self)

        # delete any existing call log entries - call log needs to be loaded
        self.phone = Phone(self.marionette)
        self.phone.launch()

    def test_dsds_call_log_sim_involved(self):
        """
        Make a call with SIM1. Receive a call on SIM2.
        Check which SIM was involved in the call on the call log.
        """

        PLIVO_TIMEOUT = 30

        test_phone_number = self.testvars['remote_phone_number']

        # Make a call so it will appear in the call log
        self.phone.make_call_and_hang_up(test_phone_number)

        # Wait for fall back to phone app
        self.wait_for_condition(lambda m: self.apps.displayed_app.name == self.phone.name)
        self.apps.switch_to_displayed_app()

        from gaiatest.utils.plivo.plivo_util import PlivoUtil
        self.plivo = PlivoUtil(
            self.testvars['plivo']['auth_id'],
            self.testvars['plivo']['auth_token'],
            self.testvars['plivo']['phone_number']
        )
        self.call_uuid = self.plivo.make_call(
            to_number=self.testvars['local_phone_numbers'][1].replace('+', ''),
            timeout=30)

        call_screen = CallScreen(self.marionette)
        call_screen.wait_for_incoming_call()
        self.plivo.hangup_call(self.call_uuid)

        Wait(self.plivo, timeout=PLIVO_TIMEOUT).until(
            lambda p: p.is_call_completed(self.call_uuid),
            message="Plivo didn't report the call as completed")
        self.call_uuid = None

        self.apps.switch_to_displayed_app()
        call_log = self.phone.tap_call_log_toolbar_button()

        call_log.tap_all_calls_tab()
        self.assertTrue(call_log.call_list[0].is_sim2_involved)
        self.assertTrue(call_log.call_list[1].is_sim1_involved)

    def tearDown(self):
        # In case the assertion fails this will still kill the call
        # An open call creates problems for future tests
        self.data_layer.kill_active_call()

        # Also ask Plivo to kill the call if needed
        if self.call_uuid:
            self.plivo.hangup_call(self.call_uuid)

        GaiaTestCase.tearDown(self)
