# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.testapp.app import TestContainer
from gaiatest import GaiaTestCase
from marionette import Marionette

class TestSystemMessages(GaiaTestCase):
    _testing_system_message = 'dummy-system-message'
    _testing_message_id     = 'message'
    _testing_message_text   = 'This is system message test powered by gaia-ui-tests'
    _testing_app_selector   = (By.CSS_SELECTOR, 'iframe[src*="test-container"][src*="/index.html"]')

    # Two basic functions are going to be tested here:
    # 1. The testing app must be launched after broadcasting the testing system message
    # 2. The testing app must show the same text we broadcast together with the message
    def test_app_launched_by_system_message(self):
        test_container = TestContainer(self.marionette)

        message_text_json = '{value: "%s"}' % self._testing_message_text
        self.broadcast_system_message(self._testing_system_message, message_text_json)

        self.wait_for_element_present(*self._testing_app_selector)

        # We've made sure app is running.
        # Now test if the message is delivered correctly to the app
        test_container.launch()
        self.on_app_launched()
        message = self.marionette.find_element(By.ID, self._testing_message_id)
        self.assertEqual(message.text, self._testing_message_text)

    # Inject some javascript to test if the message is delivered
    def on_app_launched(self):
        self.marionette.execute_script("""
            navigator.mozSetMessageHandler("%s", function(msg) {
              var messageLabel = document.createElement("label");
              messageLabel.id = "%s";
              messageLabel.innerHTML = msg.value;
              let container = document.getElementById('test-container');
              document.body.insertBefore(messageLabel, container);
            });
        """ % (self._testing_system_message, self._testing_message_id))

    #
    def broadcast_system_message(self, sys_msg, json):
        self.marionette.set_context(self.marionette.CONTEXT_CHROME)
        self.marionette.execute_script("""
            Components.classes["@mozilla.org/system-message-internal;1"]
              .getService(Ci.nsISystemMessagesInternal)
              .broadcastMessage("%s", %s, {});
        """ % (sys_msg, json))
        self.marionette.set_context(self.marionette.CONTEXT_CONTENT)

