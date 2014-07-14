# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time
from gaiatest import GaiaTestCase
from gaiatest.apps.system.app import System


class TestSmsNotification(GaiaTestCase):

    def test_sms_notification(self):

        _text_message_content = "Automated Test %s" % str(time.time())

        system = System(self.marionette)

        # Send a SMS to the device
        self.data_layer.send_sms(self.testvars['carrier']['phone_number'], _text_message_content)

        # We will wait upto 300 seconds for the SMS to arrive due to network latency
        system.wait_for_notification_toaster_displayed(timeout=300,
                    message="Notification did not appear. SMS database dump: %s " % self.data_layer.get_all_sms())
        system.wait_for_notification_toaster_not_displayed()

        self.assertTrue(any("Messages" in app.name for app in self.apps.running_apps()))
