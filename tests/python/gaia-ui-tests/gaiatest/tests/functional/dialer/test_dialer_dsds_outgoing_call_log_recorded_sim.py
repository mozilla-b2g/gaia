# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.phone.app import Phone

from marionette.marionette_test import parameterized


class TestDsdsOutgoingCallLogRecordedSim(GaiaTestCase):

    @parameterized('1', 0)
    @parameterized('2', 1)
    def test_dsds_outgoing_call_log_recorded_sim(self, default_sim_value):
        """
        Make a call with the default SIM.
        Check which SIM was involved in the call on the call log.
        """
        self.data_layer.set_setting('ril.telephony.defaultServiceId', default_sim_value)

        phone = Phone(self.marionette)
        phone.launch()

        test_phone_number = self.testvars['remote_phone_number']

        # Make a call so it will appear in the call log
        phone.make_call_and_hang_up(test_phone_number)

        # Wait for fall back to phone app
        self.wait_for_condition(lambda m: self.apps.displayed_app.name == phone.name)
        self.apps.switch_to_displayed_app()

        call_log = phone.tap_call_log_toolbar_button()
        call_log.tap_all_calls_tab()
        self.assertTrue(call_log.call_list[0].is_sim_recorded(default_sim_value))

    def tearDown(self):
        # In case the assertion fails this will still kill the call
        # An open call creates problems for future tests
        self.data_layer.kill_active_call()

        self.data_layer.delete_all_call_log_entries()

        GaiaTestCase.tearDown(self)
