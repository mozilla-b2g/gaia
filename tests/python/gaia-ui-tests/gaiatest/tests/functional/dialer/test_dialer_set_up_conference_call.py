# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette import SkipTest
from marionette.wait import Wait

from gaiatest import GaiaTestCase
from gaiatest.apps.phone.regions.call_screen import CallScreen
from gaiatest.apps.phone.app import Phone


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
        PLIVO_TIMEOUT = 30
        self.plivo = PlivoUtil(
            self.testvars['plivo']['auth_id'],
            self.testvars['plivo']['auth_token'],
            self.testvars['plivo']['phone_number']
        )

        phone = Phone(self.marionette)
        phone.launch()

        call_screen = phone.keypad.call_number(test_phone_number)
        call_screen.wait_for_outgoing_call()
        call_screen.wait_for_condition(lambda m: self.data_layer.active_telephony_state == 'connected')

        call_uuid = self.plivo.make_call(
            to_number=self.testvars['carrier']['phone_number'].replace('+', ''),
            timeout=PLIVO_TIMEOUT)

        call_screen = CallScreen(self.marionette)
        call_screen.wait_for_incoming_call_while_on_call()
        call_screen.answer_call_while_on_call()

        # Wait for Plivo to report the call as connected
        Wait(self.plivo, timeout=PLIVO_TIMEOUT).until(
            lambda p: p.is_call_connected(call_uuid),
            message='The call was not connected.')

        call_screen.merge_calls()
        self.assertEqual(call_screen.conference_label, 'Conference (2)')

    def tearDown(self):
        # Switch back to main frame before Marionette loses track bug #840931
        self.marionette.switch_to_frame()

        # In case an assertion fails this will still kill the call
        # An open call creates problems for future tests
        self.data_layer.kill_conference_call()

        GaiaTestCase.tearDown(self)
