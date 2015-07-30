# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette import SkipTest
from marionette_driver import Wait

from gaiatest import GaiaTestCase
from gaiatest.apps.phone.regions.call_screen import CallScreen
from gaiatest.apps.system.app import System
from gaiatest.apps.lockscreen.app import LockScreen
from gaiatest.mocks.mock_contact import MockContact


class TestDialerClearMissCallNotification(GaiaTestCase):

    def setUp(self):
        try:
            self.testvars['plivo']
        except KeyError:
            raise SkipTest('Plivo account details not present in test variables')
        GaiaTestCase.setUp(self)

        # We mock the voicemail notification as we have no way to clear a real voicemail after this test
        self.data_layer.add_notification('Voicemail', {
            "body": "Dial some number",
            "icon": "app://system.gaiamobile.org/style/icons/voicemail.png",
            "tag": "voicemailNotification:0"
        })

    def test_dialer_clear_miss_call_notification(self):
        """
        Pre-requisites:
        Have a voicemail in the notification bar and a missed call notification

        Repro Steps:
        1) Open the notification panel and tap the missed call notification.
        2) After the call log appears, drop down the notification panel again.
        3) The notification for the call that was just tapped is no longer present.
        """
        plivo_phone_number = self.testvars['plivo']['phone_number']

        # Create a missed call notification
        from gaiatest.utils.plivo.plivo_util import PlivoUtil
        self.plivo = PlivoUtil(
            self.testvars['plivo']['auth_id'],
            self.testvars['plivo']['auth_token'],
            plivo_phone_number,
        )
        self.call_uuid = self.plivo.make_call(
            to_number=self.environment.phone_numbers[0].replace('+', ''))

        call_screen = CallScreen(self.marionette)
        call_screen.wait_for_incoming_call()

        self.plivo.hangup_call(self.call_uuid)
        self.plivo.wait_for_call_completed(self.call_uuid)
        self.call_uuid = None

        system = System(self.marionette)
        self.marionette.switch_to_frame()
        system.wait_for_notification_toaster_displayed()
        system.wait_for_notification_toaster_not_displayed()

        # Open the notification panel
        system.wait_for_status_bar_displayed()
        utility_tray = system.open_utility_tray()
        utility_tray.wait_for_notification_container_displayed()

        # Verify the user sees the missed call event in the notification center
        notifications = utility_tray.notifications
        self.assertEqual(len(notifications), 2)
        self.assertEqual(notifications[0].title, 'Missed call')
        # Remove the first digit (country code) which is not displayed for AT&T/USA - Bug 1088756
        self.assertTrue(plivo_phone_number[1:] in notifications[0].content)
        self.assertEqual(notifications[1].title, 'Voicemail')

        notifications[0].tap_notification()

        self.marionette.switch_to_frame()
        system.open_utility_tray()
        notifications = utility_tray.notifications
        self.assertEqual(len(notifications), 1)
        self.assertEqual(notifications[0].title, 'Voicemail')

    def tearDown(self):
        # Switch back to main frame before Marionette loses track bug #840931
        self.marionette.switch_to_frame()

        # In case an assertion fails this will still kill the call
        # An open call creates problems for future tests
        self.data_layer.kill_active_call()

        # Also ask Plivo to kill the call if needed
        if self.call_uuid:
            self.plivo.hangup_call(self.call_uuid)

        self.data_layer.clear_notifications()

        GaiaTestCase.tearDown(self)
