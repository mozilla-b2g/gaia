# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
import time
from gaiatest.apps.messages.app import Messages
from gaiatest.apps.homescreen.app import Homescreen
from gaiatest.apps.system.app import System


class TestSms(GaiaTestCase):

    def test_sms_send(self):
        """
        This test sends a text message to itself. It waits for a reply message.
        https://moztrap.mozilla.org/manage/case/1322/
        """

        _text_message_content = "Automated Test %s" % str(time.time())

        # launch the app
        self.messages = Messages(self.marionette)
        self.messages.launch()

        # click new message
        new_message = self.messages.tap_create_new_message()
        new_message.type_phone_number(self.testvars['carrier']['phone_number'])
        new_message.type_message(_text_message_content)

        # click send
        self.message_thread = new_message.tap_send_without_waiting()

        # Wait for received message notification
        self.marionette.switch_to_frame()
        self.marionette.execute_script("window.wrappedJSObject.dispatchEvent(new Event('home'));")
        system = System(self.marionette)
        system.wait_for_notification_toaster_displayed()
        system.wait_for_notification_toaster_not_displayed()

        # Expand the notification bar
        utility_tray = system.open_utility_tray()
        utility_tray.wait_for_notification_container_displayed()

        # Assert there is one notification is listed in notifications-container
        notifications = utility_tray.notifications
        self.assertEqual(notifications[0].content, _text_message_content)

        # Open the Messages app
        notifications[0].tap_message_notification()
        self.messages.switch_to_messages_frame()

        # get the most recent listed and most recent received text message
        last_received_message = self.message_thread.received_messages[-1]
        last_message = self.message_thread.all_messages[-1]

        # Check the most recent received message has the same text content
        self.assertEqual(_text_message_content, last_received_message.text)

        # Check that most recent message is also the most recent received message
        self.assertEqual(last_received_message.id, last_message.id)
