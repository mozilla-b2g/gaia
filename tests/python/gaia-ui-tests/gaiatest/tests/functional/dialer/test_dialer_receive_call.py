# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette import SkipTest
from marionette.wait import Wait

from gaiatest import GaiaTestCase
from gaiatest.apps.phone.regions.call_screen import CallScreen


class TestReceiveCall(GaiaTestCase):

    def setUp(self):
        try:
            self.testvars['plivo']
        except KeyError:
            raise SkipTest('Plivo account details not present in test variables')

        GaiaTestCase.setUp(self)

    def test_receive_call(self):
        """Make a phone call from Plivo to the phone."""
        PLIVO_TIMEOUT = 30

        from gaiatest.utils.plivo.plivo_util import PlivoUtil
        self.plivo = PlivoUtil(
            self.testvars['plivo']['auth_id'],
            self.testvars['plivo']['auth_token'],
            self.testvars['plivo']['phone_number']
        )
        self.call_uuid = self.plivo.make_call(
            to_number=self.testvars['carrier']['phone_number'].replace('+', ''),
            timeout=PLIVO_TIMEOUT)

        call_screen = CallScreen(self.marionette)
        call_screen.wait_for_incoming_call()
        call_screen.answer_call()

        # Wait for Plivo to report the call as connected
        Wait(self.plivo, timeout=PLIVO_TIMEOUT).until(
            lambda p: p.is_call_connected(self.call_uuid),
            message='The call was not connected.')

        # Wait for the state to be connected
        call_screen.wait_for_condition(
            lambda m: self.data_layer.active_telephony_state == 'connected',
            timeout=30)

        call_screen.hang_up()

        # Wait for Plivo to report the call as completed
        Wait(self.plivo, timeout=PLIVO_TIMEOUT).until(
            lambda p: p.is_call_completed(self.call_uuid),
            message='The call was not completed.')
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
