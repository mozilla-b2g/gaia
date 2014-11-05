# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time

from gaiatest import GaiaTestCase
from gaiatest.apps.messages.app import Messages
from gaiatest.mocks.mock_contact import MockContact


class TestSmsAddContact(GaiaTestCase):

    def test_sms_add_contact(self):
        """ Add a contact to a message. """

        _text_message_content = "Automated Test %s" % str(time.time())

        # insert contact
        self.contact = MockContact(tel={
            'type': 'Mobile',
            'value': '555%s' % repr(time.time()).replace('.', '')[8:]})
        self.data_layer.insert_contact(self.contact)

        self.messages = Messages(self.marionette)
        self.messages.launch()

        new_message = self.messages.tap_create_new_message()
        contacts_app = new_message.tap_add_recipient()
        contacts_app.wait_for_contacts()

        # After tap, don't return a class; fall back to the displayed frame which should be Messages app
        contacts_app.contact(self.contact['givenName']).tap(return_class=None)

        self.assertIn(self.contact['givenName'], new_message.first_recipient_name)
        self.assertEquals(self.contact['tel']['value'], new_message.first_recipient_number_attribute)

        new_message.type_message(_text_message_content)
        self.assertTrue(new_message.is_send_button_enabled)
