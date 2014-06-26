# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase

from gaiatest.apps.phone.app import Phone


class TestDialer(GaiaTestCase):

    def test_dialer_make_call(self):
        """https://moztrap.mozilla.org/manage/case/1298/"""

        test_phone_number = self.testvars['remote_phone_number']

        phone = Phone(self.marionette)
        phone.launch()

        # FIXME: Bug 1011000: will need to switch it on
        # Assert that the channel has been switched to telephony
        # channel_change_call = self.data_layer.wait_for_audio_channel_changed()

        call_screen = phone.keypad.call_number(test_phone_number)

        # Wait for call screen to be dialing
        call_screen.wait_for_outgoing_call()

        # FIXME: Bug 1011000: will need to switch it on
        # Assert that the channel has been switched back to normal
        # channel_change_hang = self.data_layer.wait_for_audio_channel_changed()

        # Wait for the state to get to at least 'dialing'
        active_states = ('dialing', 'alerting', 'connecting', 'connected')
        call_screen.wait_for_condition(
            lambda m: self.data_layer.active_telephony_state in active_states,
            timeout=30)
        self.apps.switch_to_displayed_app()

        if len(test_phone_number) <= 12:
            # Check the number displayed is the one we dialed
            self.assertEqual(test_phone_number, call_screen.outgoing_calling_contact)
        else:
            self.assertEqual(test_phone_number[:2], call_screen.outgoing_calling_contact[:2])

        # FIXME: Bug 1011000: will need to switch it on
        # self.assertEqual(channel_change_call, "telephony")
        # self.assertEqual(channel_change_hang, "normal")

    def tearDown(self):
        # Switch back to main frame before Marionette loses track bug #840931
        self.marionette.switch_to_frame()

        # In case the assertion fails this will still kill the call
        # An open call creates problems for future tests
        self.data_layer.kill_active_call()

        GaiaTestCase.tearDown(self)
