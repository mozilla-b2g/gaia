# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time
from gaiatest import GaiaTestCase
from gaiatest.apps.messages.app import Messages


class TestSmsReport(GaiaTestCase):

    def test_sms_report(self):
        
        time_test_began = time.time()
        _text_message_content = "Automated Test %s" % str(time_test_began)
        _test_phone_number = self.environment.phone_numbers[0]

        error_range_sent_in_seconds = 120
        error_range_received_in_seconds = 300
        
        # Sending the message
        self.messages = Messages(self.marionette)
        self.messages.launch()
        new_message = self.messages.create_new_message(recipients=_test_phone_number,
                                                       message=_text_message_content)

        self.message_thread = new_message.tap_send()
        self.message_thread.wait_for_received_messages()

        last_received_message = self.message_thread.received_messages[-1]
        last_message = self.message_thread.all_messages[-1]
        
        report = last_received_message.open_report()

        # Checking that the data in the received report is correct
        self.assertTrue(report.is_message_an_sms)
        self.assertEqual(_test_phone_number, report.sender)

        date_sent_maximum_delay = time_test_began + error_range_sent_in_seconds 
        self.assertLessEqual(report.sent_date, date_sent_maximum_delay)

        date_received_maximum_delay = time_test_began + error_range_received_in_seconds
        self.assertLessEqual(report.received_date, date_received_maximum_delay)  

        report.close()

        last_sent_message = self.message_thread.sent_messages[0]
        report = last_sent_message.open_report()

        # Checking that the data in the sent report is correct
        self.assertTrue(report.is_message_an_sms)
        self.assertLessEqual(report.sent_date, date_sent_maximum_delay)
        self.assertEqual(_test_phone_number, report.receiver)
        
