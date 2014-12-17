# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.phone.app import Phone
from gaiatest.mocks.mock_call import MockCall


class TestRedialLastNumber(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

        self.test_phone_number = self.testvars['remote_phone_number']

        self.phone = Phone(self.marionette)
        self.phone.launch()

        mock_call = MockCall(self.test_phone_number, 'dialing')
        self.data_layer.insert_call_entry(mock_call)

    def test_redial_last_number(self):
        """
        https://moztrap.mozilla.org/manage/case/9043/
        """
        keypad = self.phone.keypad

        # Check that there is no phone number displayed
        self.assertEqual('', keypad.phone_number)

        keypad.tap_call_button(False)
        keypad.wait_for_phone_number_ready()

        # Check that the last dialed number is displayed
        self.assertEqual(self.test_phone_number, keypad.phone_number)

        call_screen = keypad.tap_call_button()

        # Wait for call screen to be dialing
        call_screen.wait_for_outgoing_call()

        if len(self.test_phone_number) <= call_screen.MAX_NUMBER_OF_DISPLAYED_DIGITS:
            # Check the number displayed is the one we dialed
            self.assertEqual(self.test_phone_number, call_screen.outgoing_calling_contact)
        else:
            self.assertEqual(self.test_phone_number[2:], call_screen.outgoing_calling_contact[2:])

    def tearDown(self):
        # Switch back to main frame before Marionette loses track bug #840931
        self.marionette.switch_to_frame()

        # In case the assertion fails this will still kill the call
        # An open call creates problems for future tests
        self.data_layer.kill_active_call()

        GaiaTestCase.tearDown(self)
