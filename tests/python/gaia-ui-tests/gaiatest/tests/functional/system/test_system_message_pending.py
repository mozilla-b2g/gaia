# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest.apps.testapp.app import TestContainer
from gaiatest import GaiaTestCase
from marionette import Marionette


class TestSystemMessage(GaiaTestCase):
    _testing_message_id = 'message'
    _testing_message_text = 'System message test powered by gaia-ui-tests'

    def test_pending_system_message(self):
        """"
        The scenario we want to test is:

        1) Launch an app.
        2) Create DOM side SystemMessageManager without setting the handler.
        3) Broadcast system message internally. The message will be pending
           until the app sets the message handler.
        4) The app sets the message handler and the message should be signalled
           right away.
        """

        test_container = TestContainer(self.marionette)

        # Launch the app and call mozHasPendingMessage to ensure the
        # existence of SystemMessageManager in DOM side.
        test_container.launch()
        self.marionette.execute_script("""
            navigator.mozHasPendingMessage('whatever');
        """)

        # Broadcast the system message and the test app shouldn't receive it
        # since the hanlder is not set yet.
        test_container.broadcast_dummy_system_message(
            self._testing_message_text)

        # Set the handler and test if the message is delivered correctly.
        test_container.set_dummy_system_message_handler(
            self._testing_message_id)

        message_text = test_container.find_message_text(
            self._testing_message_id)

        self.assertEqual(message_text, self._testing_message_text)
