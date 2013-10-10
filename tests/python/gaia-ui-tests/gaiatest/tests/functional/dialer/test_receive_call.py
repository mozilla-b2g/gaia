# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time

from gaiatest import GaiaTestCase
from gaiatest.apps.phone.regions.incoming_call import IncomingCall
from gaiatest.utils.plivo_helper.plivo_helper import Plivo


class TestReceiveCall(GaiaTestCase):

    def test_receive_call(self):
        self.plivo = Plivo(self.testvars['plivo'])

        self.plivo_request_uuid = self.plivo.make_call(
            self.testvars['carrier']['phone_number'])

        # Wait for call
        incoming_call = IncomingCall(self.marionette)
        incoming_call.switch_to_incoming_call_frame()
        incoming_call.wait_for_incoming_call()

        # Just wait for a while
        time.sleep(3)

        # Hangup call
        incoming_call.hangup_call()

        # TODO: verify that the call was hanged up when plivo fixes API issue

        # when everything goes just fine, no need to cleanup
        del self.plivo_request_uuid

    def tearDown(self):
        if hasattr(self, 'plivo_request_uuid'):
            self.plivo.hangup_call(request_uuid=self.plivo_request_uuid)
