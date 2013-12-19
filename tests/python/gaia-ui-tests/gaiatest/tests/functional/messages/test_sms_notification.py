# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time
from gaiatest import GaiaTestCase
from gaiatest.apps.system.app import System
from gaiatest.apps.messages.app import Messages


class TestSmsNotification(GaiaTestCase):

    def test_sms_notification(self):

        _text_message_content = "Automated Test %s" % str(time.time())

        system = System(self.marionette)

        # Send a SMS to the device
        self.data_layer.send_sms(self.testvars['carrier']['phone_number'], _text_message_content)
        system.wait_for_notification_toaster_displayed()
        system.wait_for_notification_toaster_not_displayed()

        self.assertTrue(self.apps.running_apps[1].name == "Messages")
