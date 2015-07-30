# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.phone.app import Phone
from gaiatest.apps.phone.regions.call_screen import CallScreen

from marionette import SkipTest
from marionette_driver import Wait


class TestCallLogAllCalls(GaiaTestCase):

    def setUp(self):

        try:
            self.testvars['plivo']
        except KeyError:
            raise SkipTest('Plivo account details not present in test variables')

        GaiaTestCase.setUp(self)

        # delete any existing call log entries - call log needs to be loaded
        self.phone = Phone(self.marionette)
        self.phone.launch()

    def test_call_log_all_calls(self):
        """
        https://moztrap.mozilla.org/manage/case/1306/
        """
        test_phone_number = self.testvars['remote_phone_number']

        # Remove the first digit (country code) which is not displayed for AT&T/USA - Bug 1088756
        plivo_phone_number = self.testvars['plivo']['phone_number'][1:]

        # Make a call so it will appear in the call log
        self.phone.make_call_and_hang_up(test_phone_number)

        # Wait for fall back to phone app
        self.wait_for_condition(lambda m: self.apps.displayed_app.name == self.phone.name)
        self.apps.switch_to_displayed_app()

        from gaiatest.utils.plivo.plivo_util import PlivoUtil
        self.plivo = PlivoUtil(
            self.testvars['plivo']['auth_id'],
            self.testvars['plivo']['auth_token'],
            self.testvars['plivo']['phone_number']
        )

        self.call_uuid = self.plivo.make_call(
            to_number=self.environment.phone_numbers[0].replace('+', ''))
        call_screen = CallScreen(self.marionette)
        call_screen.wait_for_incoming_call()

        self.plivo.hangup_call(self.call_uuid)
        self.plivo.wait_for_call_completed(self.call_uuid)
        self.call_uuid = None

        self.apps.switch_to_displayed_app()
        call_log = self.phone.tap_call_log_toolbar_button()

        # Check all calls tab
        call_log.tap_all_calls_tab()
        self.assertTrue(call_log.is_all_calls_tab_selected)

        self.wait_for_condition(lambda m: len(call_log.call_list) == 2)
        call_list = call_log.call_list

        # Check that the calls displayed are for the calls we made/received
        self.assertIn(plivo_phone_number, call_list[0].phone_number)
        self.assertEqual('incoming', call_list[0].call_type)
        self.assertIn(test_phone_number, call_list[1].phone_number)
        self.assertEqual('dialing', call_list[1].call_type)

        # Check missed calls tab
        call_log.tap_missed_calls_tab()
        self.assertTrue(call_log.is_missed_calls_tab_selected)

        self.wait_for_condition(lambda m: len(call_log.call_list) == 1)
        call_list = call_log.call_list

        # Check that the calls displayed are for the calls we received
        self.assertIn(plivo_phone_number, call_list[0].phone_number)
        self.assertEqual('incoming', call_list[0].call_type)

    def tearDown(self):
        # In case the assertion fails this will still kill the call
        # An open call creates problems for future tests
        self.data_layer.kill_active_call()

        # Also ask Plivo to kill the call if needed
        if self.call_uuid:
            self.plivo.hangup_call(self.call_uuid)

        GaiaTestCase.tearDown(self)
