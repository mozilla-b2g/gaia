# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.system.regions.iac_publisher import IacPublisher


class TestInterAppComm(GaiaTestCase):

    def test_inter_app_comm(self):
        _testing_message = "this is a test"

        iac_publisher = IacPublisher(self.marionette)
        iac_publisher.launch()
        iac_publisher.type_message(_testing_message)
        iac_publisher.tap_send_message()
        iac_publisher.wait_for_message_received()

        self.assertEqual(iac_publisher.received_str_message, _testing_message)
        self.assertEqual(iac_publisher.received_blob_message, _testing_message)
        self.assertEqual(iac_publisher.number_of_connections, "1")
