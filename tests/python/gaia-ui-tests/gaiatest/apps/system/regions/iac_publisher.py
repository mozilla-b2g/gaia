# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base


class IacPublisher(Base):

    name = "Test IAC Publisher"

    _pub_app_msg_to_send_locator = (By.ID, "msgToSend")
    _pub_app_send_button_locator = (By.ID, "sendButton")
    _pub_app_num_conns_locator = (By.ID, "numConns")
    _pub_app_received_str_msg_locator = (By.ID, "receivedStrMsg")
    _pub_app_received_blob_msg_locator = (By.ID, "receivedBlobMsg")

    def launch(self):
        Base.launch(self, launch_timeout=120000)
        Wait(self.marionette).until(
            expected.element_displayed(*self._pub_app_msg_to_send_locator))

    def type_message(self, value):
        message_field = self.marionette.find_element(*self._pub_app_msg_to_send_locator)
        message_field.tap()
        message_field.clear()
        message_field.send_keys(value)

    def tap_send_message(self):
        self.marionette.find_element(*self._pub_app_send_button_locator).tap()

    def wait_for_message_received(self):
        Wait(self.marionette).until(
            expected.element_present(*self._pub_app_received_str_msg_locator))
        Wait(self.marionette).until(
            expected.element_present(*self._pub_app_received_blob_msg_locator))

    @property
    def received_str_message(self):
        return self.marionette.find_element(*self._pub_app_received_str_msg_locator).get_attribute('value')

    @property
    def received_blob_message(self):
        return self.marionette.find_element(*self._pub_app_received_blob_msg_locator).get_attribute('value')

    @property
    def number_of_connections(self):
        return self.marionette.find_element(*self._pub_app_num_conns_locator).get_attribute('value')
