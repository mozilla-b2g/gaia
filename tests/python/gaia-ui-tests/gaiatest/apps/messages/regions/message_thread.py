# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait
from marionette_driver.marionette import Actions

from gaiatest.apps.base import Base
from gaiatest.apps.base import PageRegion
from gaiatest.apps.messages.app import Messages
from gaiatest.form_controls.header import GaiaHeader


class MessageThread(Base):

    _all_messages_locator = (By.CSS_SELECTOR, '#messages-container li.message')
    _received_message_content_locator = (By.CSS_SELECTOR, "#messages-container li.message.received")
    _sent_message_locator = (By.CSS_SELECTOR, '#messages-container li.message.sent')
    _header_link_locator = (By.ID, 'messages-header')
    _call_button_locator = (By.ID, 'messages-call-number-button')

    def wait_for_received_messages(self, interval=5, timeout=300):
        Wait(self.marionette, timeout).until(expected.element_displayed(
            Wait(self.marionette, timeout).until(expected.element_present(
                *self._received_message_content_locator))))

    @property
    def received_messages(self):
        return [Message(self.marionette, message) for message in self.marionette.find_elements(*self._received_message_content_locator)]

    @property
    def sent_messages(self):
        return [Message(self.marionette, message) for message in self.marionette.find_elements(*self._sent_message_locator)]

    @property
    def all_messages(self):
        return [Message(self.marionette, message) for message in self.marionette.find_elements(*self._all_messages_locator)]

    @property
    def _header(self):
        return GaiaHeader(self.marionette, self.marionette.find_element(*self._header_link_locator))

    @property
    def header_text(self):
        return self._header.text

    def tap_header(self):
        self._header.tap()

        from gaiatest.apps.messages.regions.activities import Activities
        return Activities(self.marionette)

    def tap_call(self):
        call = Wait(self.marionette).until(expected.element_present(*self._call_button_locator))
        Wait(self.marionette).until(expected.element_displayed(call))
        call.tap()
        from gaiatest.apps.phone.regions.keypad import Keypad
        keypad = Keypad(self.marionette)
        keypad.wait_for_phone_number_ready()
        return keypad


class Message(PageRegion):

    _text_locator = (By.CSS_SELECTOR, '.bubble p')
    _attachments_locator = (By.CSS_SELECTOR, '.bubble .attachment-container.preview')
    _message_section_locator = (By.CSS_SELECTOR, '.bubble')

    def open_report(self):
        activity = self.long_press_message()
        return activity.tap_report()

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

    def tap_attachment(self):
        self.root_element.find_element(*self._attachments_locator).tap()
        from gaiatest.apps.gallery.regions.view_image import ViewImage
        return ViewImage(self.marionette)

    @property
    def id(self):
        return self.root_element.get_attribute('id')

    def long_press_message(self):
        message = self.root_element.find_element(*self._message_section_locator)
        Actions(self.marionette).\
            press(message).\
            wait(3).\
            release().\
            perform()

        from gaiatest.apps.messages.regions.activities import Activities
        return Activities(self.marionette)
