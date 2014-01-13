# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.base import Base
from gaiatest.apps.base import PageRegion
from gaiatest.apps.messages.app import Messages


class MessageThread(Base):

    _all_messages_locator = (By.CSS_SELECTOR, '#messages-container li.message')
    _received_message_content_locator = (By.CSS_SELECTOR, "#messages-container li.message.received")
    _back_header_link_locator = (By.ID, 'messages-back-button')
    _message_header_locator = (By.ID, 'messages-header-text')
    _call_button_locator = (By.CSS_SELECTOR, 'button[data-l10n-id="call"]')

    def wait_for_received_messages(self, timeout=180):
        self.wait_for_element_displayed(*self._received_message_content_locator, timeout=timeout)

    def tap_back_button(self):
        # In a message thread, tap the back button to return to main message list
        back_header_button = self.marionette.find_element(*self._back_header_link_locator)
        back_header_button.tap()
        messages = Messages(self.marionette)
        messages.wait_for_message_list()
        return messages

    @property
    def received_messages(self):
        return [Message(self.marionette, message) for message in self.marionette.find_elements(*self._received_message_content_locator)]

    @property
    def all_messages(self):
        return [Message(self.marionette, message) for message in self.marionette.find_elements(*self._all_messages_locator)]

    def tap_header(self):
        self.wait_for_element_displayed(*self._message_header_locator)
        self.marionette.find_element(*self._message_header_locator).tap()

    def tap_call(self):
        self.marionette.find_element(*self._call_button_locator).tap()
        self.wait_for_element_not_displayed(*self._call_button_locator)
        from gaiatest.apps.phone.regions.keypad import Keypad
        keypad = Keypad(self.marionette)
        keypad.switch_to_keypad_frame()
        return keypad


class Message(PageRegion):

    _text_locator = (By.CSS_SELECTOR, '.bubble p')
    _attachments_locator = (By.CSS_SELECTOR, '.bubble .attachment-container.preview')

    @property
    def text(self):
        return self.root_element.find_element(*self._text_locator).text

    @property
    def has_attachments(self):
        try:
            self.root_element.find_element(*self._attachments_locator)
        except:
            return False

        return True

    @property
    def id(self):
        return self.root_element.get_attribute('id')
