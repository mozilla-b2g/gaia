# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.base import Base


class NewMessage(Base):

    _receiver_input_locator = (By.CSS_SELECTOR, '#messages-recipients-list span.recipient')
    _message_field_locator = (By.ID, 'messages-input')
    _send_message_button_locator = (By.ID, 'messages-send-button')
    _attach_button_locator = (By.ID, 'messages-attach-button')
    _message_sending_locator = (By.CSS_SELECTOR, "li.message.outgoing.sending")
    _thread_messages_locator = (By.ID, 'thread-messages')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        section = self.marionette.find_element(*self._thread_messages_locator)
        self.wait_for_condition(lambda m: section.location['x'] == 0)

    def type_phone_number(self, value):
        self.wait_for_element_displayed(*self._receiver_input_locator)
        contact_field = self.marionette.find_element(*self._receiver_input_locator)
        contact_field.send_keys(value)

    def type_message(self, value):
        # change the focus to the message field to enable the send button
        self.wait_for_element_displayed(*self._message_field_locator)
        message_field = self.marionette.find_element(*self._message_field_locator)
        message_field.tap()
        message_field.send_keys(value)

    def tap_send(self):
        self.marionette.find_element(*self._send_message_button_locator).tap()
        self.wait_for_element_not_present(*self._message_sending_locator, timeout=120)
        from gaiatest.apps.messages.regions.message_thread import MessageThread
        return MessageThread(self.marionette)

    def tap_attachment(self):
        self.marionette.find_element(*self._attach_button_locator).tap()
        from gaiatest.apps.messages.regions.select_attachment import SelectAttachment
        return SelectAttachment(self.marionette)
