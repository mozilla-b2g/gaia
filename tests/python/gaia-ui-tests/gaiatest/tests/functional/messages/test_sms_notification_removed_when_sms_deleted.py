# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time

from marionette_driver import Wait

from gaiatest import GaiaTestCase
from gaiatest.apps.messages.app import Messages
from gaiatest.apps.system.app import System


class TestSmsNotificationRemovedWhenSMSDeleted(GaiaTestCase):

    def test_sms_notification_removed_when_sms_deleted(self):
        """
        https://moztrap.mozilla.org/manage/case/8778/
        """

        _text_message_content = "Automated Test %s" % str(time.time())

        # launch messages app
        messages = Messages(self.marionette)
        messages.launch()

        # Send a SMS to the device
        self.data_layer.send_sms(self.environment.phone_numbers[0], _text_message_content)

        system = System(self.marionette)

        # We will wait upto 300 seconds for the SMS to arrive due to network latency
        system.wait_for_notification_toaster_displayed(timeout=300,
                    message="Notification did not appear. SMS database dump: %s " % self.data_layer.get_all_sms())
        system.wait_for_notification_toaster_not_displayed()

        self.apps.switch_to_displayed_app()

        # Tap on the latest received SMS
        message_thread = messages.tap_first_received_message()
        Wait(self.marionette).until(lambda m: len(message_thread.received_messages) > 0)
        messages_number = len(message_thread.all_messages)
        last_received_message = message_thread.received_messages[-1]

        # Delete latest received SMS
        activities = last_received_message.long_press_message()
        activities.tap_delete_message()
        activities.confirm_delete_message()

        Wait(self.marionette).until(lambda m: len(message_thread.all_messages) == messages_number - 1)

        self.marionette.switch_to_frame()

        # Check that SMS notification no longer appears in utility tray
        utility_tray = system.open_utility_tray()
        self.assertEqual(0, len(utility_tray.notifications))
