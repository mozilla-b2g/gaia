# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.mocks.mock_contact import MockContact
from gaiatest.apps.phone.app import Phone


class TestDialerFindContact(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)
        # Seed the contact with the remote phone number so we don't call random people
        self.contact = MockContact(tel={
            'type': 'Mobile',
            'value': "%s" % self.testvars['remote_phone_number']})
        self.data_layer.insert_contact(self.contact)

        # launch the Phone app
        self.phone = Phone(self.marionette)
        self.phone.launch()

    def test_dialer_find_contact(self):

        number_to_verify = self.contact['tel']['value']

        # Dial number
        self.phone.keypad.dial_phone_number(number_to_verify[:5])

        # Assert search popup is displayed
        self.phone.keypad.wait_for_search_popup_visible()

        # Assert name and phone number are the ones in the saved contact
        self.assertEqual(self.phone.keypad.suggested_name, self.contact['name'])
        self.assertEqual(self.phone.keypad.suggested_phone_number, number_to_verify)

        # Tap search popup suggestion
        call_screen = self.phone.keypad.tap_search_popup()

        # Wait for call screen to be dialing
        call_screen.wait_for_outgoing_call()

        # Wait for the state to get to at least 'dialing'
        active_states = ('dialing', 'alerting', 'connecting', 'connected')
        call_screen.wait_for_condition(
            lambda m: self.data_layer.active_telephony_state in active_states,
            timeout=30)

        if len(number_to_verify) <= call_screen.MAX_NUMBER_OF_DISPLAYED_DIGITS:
            # Check the number displayed is the one we dialed
            self.assertIn(number_to_verify, call_screen.calling_contact_information)
        else:
            self.assertIn(number_to_verify[2:], call_screen.calling_contact_information)

    def tearDown(self):
        # Switch back to main frame before Marionette loses track bug #840931
        self.marionette.switch_to_frame()

        # In case the assertion fails this will still kill the call
        # An open call creates problems for future tests
        self.data_layer.kill_active_call()

        GaiaTestCase.tearDown(self)
