# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette import expected
from marionette import Wait
from marionette.by import By
from gaiatest.apps.base import Base


class Messages(Base):

    name = 'Messages'

    _create_new_message_locator = (By.ID, 'icon-add')
    _first_message_locator = (By.ID, 'thread-1')
    _messages_frame_locator = (By.CSS_SELECTOR, 'iframe[data-url*=sms]')
    _options_icon_locator = (By.ID, 'threads-options-icon')
    _app_ready_locator = (By.CLASS_NAME, 'js-app-ready')

    def launch(self):
        Base.launch(self)
        Wait(self.marionette).until(expected.element_displayed(
            Wait(self.marionette).until(expected.element_present(
                *self._app_ready_locator))))

    def tap_create_new_message(self):
        self.marionette.find_element(*self._create_new_message_locator).tap()
        from gaiatest.apps.messages.regions.new_message import NewMessage
        return NewMessage(self.marionette)

    def tap_options(self):
        self.marionette.find_element(*self._options_icon_locator).tap()
        from gaiatest.apps.messages.regions.activities import Activities
        return Activities(self.marionette)

    def wait_for_message_list(self):
        Wait(self.marionette).until(expected.element_displayed(
            Wait(self.marionette).until(expected.element_present(
                *self._create_new_message_locator))))

    def wait_for_message_received(self, timeout=180):
        Wait(self.marionette, timeout).until(expected.element_displayed(
            Wait(self.marionette).until(expected.element_present(
                *self._first_message_locator))))

    def tap_first_received_message(self):
        self.marionette.find_element(*self._first_message_locator).tap()
        from gaiatest.apps.messages.regions.message_thread import MessageThread
        return MessageThread(self.marionette)
