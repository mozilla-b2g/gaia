# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time

from gaiatest import GaiaTestCase
from gaiatest.apps.messages.app import Messages
from gaiatest.mocks.mock_contact import MockContact


class TestContactMatch(GaiaTestCase):

    def test_contact_match(self):

        # insert contact
        self.contact = MockContact(tel={
            'value': '555%s' % repr(time.time()).replace('.', '')[8:]})
        self.data_layer.insert_contact(self.contact)

        # launch Messages app
        self.messages = Messages(self.marionette)
        self.messages.launch()

        new_message = self.messages.tap_create_new_message()

        from gaiatest.apps.keyboard.app import Keyboard
        keyboard = Keyboard(self.marionette)

        keyboard.send(self.contact['name'])
        keyboard.tap_enter()

        # verify that contacts and tel number match
        self.assertEqual(self.contact['name'], new_message.first_recipient_name)
        self.assertEqual(self.contact['tel']['value'], new_message.first_recipient_number_attribute)

