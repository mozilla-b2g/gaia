# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette import SkipTest
from marionette.wait import Wait

from gaiatest import GaiaTestCase
from gaiatest.apps.phone.regions.call_screen import CallScreen
from gaiatest.apps.phone.app import Phone

PLIVO_TIMEOUT = 30


class TestSetUpConferenceCall(GaiaTestCase):

    def setUp(self):
        try:
            self.testvars['plivo']
        except KeyError:
            raise SkipTest('Plivo account details not present in test variables')

        GaiaTestCase.setUp(self)

    def test_set_up_conference_call(self):
        """Set up a conference between the remote phone and Plivo."""

        test_phone_number = self.testvars['remote_phone_number']
        from gaiatest.utils.plivo.plivo_util import PlivoUtil

        self.plivo = PlivoUtil(
            self.testvars['plivo']['auth_id'],
            self.testvars['plivo']['auth_token'],
            self.testvars['plivo']['phone_number']
        )

        self.is_in_conference_call = False
        self.is_in_regular_call = False

        phone = Phone(self.marionette)
        phone.launch()

        call_screen = phone.keypad.call_number(test_phone_number)
        call_screen.wait_for_outgoing_call()
        self.is_in_regular_call = True
        call_screen.wait_for_condition(lambda m: self.data_layer.active_telephony_state == 'connected')

        self.call_uuid = self.plivo.make_call(
            to_number=self.testvars['local_phone_numbers'][0].replace('+', ''),
            timeout=PLIVO_TIMEOUT)

        call_screen = CallScreen(self.marionette)
        call_screen.wait_for_incoming_call_while_on_call()
        call_screen.answer_call_while_on_call()

        # Wait for Plivo to report the call as connected
        Wait(self.plivo, timeout=PLIVO_TIMEOUT).until(
            lambda p: p.is_call_connected(self.call_uuid),
            message='The call was not connected.')

        call_screen.merge_calls()
        self.is_in_regular_call = False
        self.is_in_conference_call = True
        self.assertEqual(call_screen.conference_label, 'Conference (2)')

        call_screen.hang_up()
        self.is_in_conference_call = False

        Wait(self.plivo, timeout=PLIVO_TIMEOUT).until(
            lambda p: p.is_call_completed(self.call_uuid),
            message="Plivo didn't report the call as completed")
        self.call_uuid = None

    def tearDown(self):
        # In case an assertion fails this will still kill the call
        # An open call creates problems for future tests
        if self.is_in_regular_call:
            self.data_layer.kill_active_call()

        if self.is_in_conference_call:
            self.data_layer.kill_conference_call()

        # Also ask Plivo to kill the call if needed
        if self.call_uuid:
            self.plivo.hangup_call(self.call_uuid)

        GaiaTestCase.tearDown(self)
