# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest.apps.testapp.app import TestContainer
from gaiatest import GaiaTestCase
from marionette import Marionette


class TestSystemMessage(GaiaTestCase):
    _testing_message_id = 'message'
    _testing_message_text = 'System message test powered by gaia-ui-tests'

    def test_app_launched_by_system_message(self):
        """
        Two basic functions are going to be tested here:
        1. The testing app must be launched after broadcasting the testing
           system message.
        2. The testing app must show the same text that we broadcast together
           with the testing system message.
        """

        test_container = TestContainer(self.marionette)

        # Broadcast a system message to bring up the test app.
        test_container.broadcast_dummy_system_message(
            self._testing_message_text)

        test_container.wait_until_launched()

        # Bring the app to foreground first.
        test_container.launch()

        # Set the handler and test if the message is delivered correctly.
        test_container.set_dummy_system_message_handler(
            self._testing_message_id)

        message_text = test_container.find_message_text(
            self._testing_message_id)

        self.assertEqual(message_text, self._testing_message_text)
