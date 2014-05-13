# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time
from marionette.by import By
from gaiatest.apps.base import Base 
from gaiatest import GaiaTestCase
from marionette import Marionette

class TestIacPublisher(Base):
    def __init__(self, marionette):
        Base.__init__(self, marionette)
        self.name = "Test IAC Publisher"

    def launch(self):
        Base.launch(self, launch_timeout=120000)

class TestInterAppComm(GaiaTestCase):
    _testing_message = "this is a test"

    _pub_app_msg_to_send_locator = (By.ID, "msgToSend")
    _pub_app_send_button_locator = (By.ID, "sendButton")
    _pub_app_num_conns_locator = (By.ID, "numConns")
    _pub_app_received_msg_locator = (By.ID, "receivedMsg")

    def setUp(self):
        GaiaTestCase.setUp(self)

    def test_inter_app_comm(self):
        test_iac_publisher = TestIacPublisher(self.marionette)

        test_iac_publisher.launch()

        self.wait_for_element_displayed(*self._pub_app_msg_to_send_locator)
        self.marionette.execute_script("""
            var msgToSend = document.getElementById('msgToSend');
            msgToSend.value = "%s";
        """ % (self._testing_message))

        self.marionette.find_element(*self._pub_app_send_button_locator).tap();

        self.wait_for_element_present(*self._pub_app_received_msg_locator)

        received_msg = self.marionette.find_element(*self._pub_app_received_msg_locator);
        self.assertEqual(received_msg.get_attribute("value"), self._testing_message)

        num_conns = self.marionette.find_element(*self._pub_app_num_conns_locator);
        self.assertEqual(num_conns.get_attribute("value"), "1")
