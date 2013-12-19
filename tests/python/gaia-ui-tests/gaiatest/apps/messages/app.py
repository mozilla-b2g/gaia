# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.base import Base


class Messages(Base):

    name = 'Messages'

    _create_new_message_locator = (By.ID, 'icon-add')
    _first_message_locator = (By.ID, 'thread-1')
    _messages_frame_locator = (By.CSS_SELECTOR, 'iframe[data-url*=sms]')

    def launch(self):
        Base.launch(self)
        self.wait_for_element_displayed(*self._create_new_message_locator)

    def tap_create_new_message(self):
        self.marionette.find_element(*self._create_new_message_locator).tap()
        from gaiatest.apps.messages.regions.new_message import NewMessage
        return NewMessage(self.marionette)

    def wait_for_message_list(self):
        self.wait_for_element_displayed(*self._create_new_message_locator)

    def wait_for_message_received(self, timeout=180):
        self.wait_for_element_displayed(*self._first_message_locator, timeout=timeout)

    def tap_first_received_message(self):
        self.marionette.find_element(*self._first_message_locator).tap()
        from gaiatest.apps.messages.regions.message_thread import MessageThread
        return MessageThread(self.marionette)

    def switch_to_messages_frame(self):
        self.marionette.switch_to_frame()
        self.wait_for_element_present(*self._messages_frame_locator)
        messages_frame = self.marionette.find_element(*self._messages_frame_locator)
        self.marionette.switch_to_frame(messages_frame)
