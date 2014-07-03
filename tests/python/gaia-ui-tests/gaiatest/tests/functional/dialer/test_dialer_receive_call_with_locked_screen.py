# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette import SkipTest

from gaiatest import GaiaTestCase
from gaiatest.apps.phone.regions.call_screen import CallScreen
from gaiatest.utils.plivo.plivo_util import PlivoUtil


class TestReceiveCallScreenLocked(GaiaTestCase):

    def setUp(self):
        try:
            self.testvars['plivo']
        except KeyError:
            raise SkipTest('Plivo account details not present in test variables')

        GaiaTestCase.setUp(self)

    def test_receive_call_with_locked_screen(self):
        """Make a phone call from Plivo to the phone."""
        PLIVO_TIMEOUT = 30
        self.call_uuid = False

        self.plivo = PlivoUtil(
            self.testvars['plivo']['auth_id'],
            self.testvars['plivo']['auth_token'],
            self.testvars['plivo']['phone_number']
        )

        self.device.lock()
        self.call_uuid = self.plivo.make_call(
            to_number=self.testvars['carrier']['phone_number'].replace('+', ''),
            timeout=PLIVO_TIMEOUT)

        # Wait for the incoming call screen to show up
        call_screen = CallScreen(self.marionette)
        call_screen.wait_for_incoming_call_with_locked_screen()

        # Reject the call
        call_screen.reject_call()

        # Check that the screen is still locked
        self.assertTrue(self.device.is_locked)

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
