# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base


class TestContainer(Base):

    name = 'Test Container'

    _app_selector = (By.CSS_SELECTOR,
                     'iframe[src*="test-container"][src*="/index.html"]')

    _main_frame_locator = (By.ID, 'test-container')
    _dummy_system_message_id = 'dummy-system-message'

    def launch(self):
        Base.launch(self)
        Wait(self.marionette).until(
            expected.element_present(*self._main_frame_locator))

    def wait_until_launched(self):
        self.marionette.switch_to_frame()
        Wait(self.marionette).until(
            expected.element_present(*self._app_selector))

    # Set dummy message handler which will place the message
    # carried by dummy system message in the element with id
    # |msg_placeholder_id|
    def set_dummy_system_message_handler(self, msg_placeholder_id):
        self.marionette.execute_script("""
            navigator.mozSetMessageHandler('%s', function(msg) {
              var messageLabel = document.createElement('label');
              messageLabel.id = '%s';
              messageLabel.innerHTML = msg.value;
              let container = document.getElementById('test-container');
              document.body.insertBefore(messageLabel, container);
            });
        """ % (self._dummy_system_message_id, msg_placeholder_id))

    # Broadcast dummy system message which will carry message |msg|
    def broadcast_dummy_system_message(self, msg):
        self.marionette.set_context(self.marionette.CONTEXT_CHROME)
        self.marionette.execute_script("""
            Components.classes["@mozilla.org/system-message-internal;1"]
              .getService(Ci.nsISystemMessagesInternal)
              .broadcastMessage('%s', { value: '%s' }, {});
        """ % (self._dummy_system_message_id, msg))
        self.marionette.set_context(self.marionette.CONTEXT_CONTENT)

    def find_message_text(self, msg_placeholder_id):
        message = self.marionette.find_element(By.ID, msg_placeholder_id)
        return message.text
