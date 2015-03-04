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


class TestReceiveCallFromKnownContactNotification(GaiaTestCase):

    def setUp(self):
        try:
            self.testvars['plivo']
        except KeyError:
            raise SkipTest('Plivo account details not present in test variables')
        GaiaTestCase.setUp(self)

        self.contact = MockContact()
        self.contact.update(tel={
            'type': 'Mobile',
            'value': self.testvars['plivo']['phone_number']}
        )
        self.data_layer.insert_contact(self.contact)

    def test_dialer_miss_call_from_known_contact_notification(self):
        """
        https://moztrap.mozilla.org/manage/case/9294/
        """
        self.device.lock()

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

        lock_screen = LockScreen(self.marionette)
        lock_screen.switch_to_frame()
        lock_screen.wait_for_notification()

        # Check if the screen is turned on
        self.assertTrue(self.device.is_screen_enabled)

        # Verify the user sees a missed call notification message
        # and the known contacts info is shown.
        self.assertTrue(lock_screen.notifications[0].is_visible)
        self.assertEqual(lock_screen.notifications[0].title, 'Missed call')
        self.assertTrue(self.contact.givenName in lock_screen.notifications[0].content)

        self.device.unlock()

        system = System(self.marionette)
        system.wait_for_notification_toaster_not_displayed()

        # Expand the notification bar
        system.wait_for_status_bar_displayed()
        utility_tray = system.open_utility_tray()
        utility_tray.wait_for_notification_container_displayed()

        # Verify the user sees the missed call event in the notification center
        # and the known contacts info is shown.
        notifications = utility_tray.notifications
        self.assertEqual(notifications[0].title, 'Missed call')
        self.assertTrue(self.contact.givenName in notifications[0].content)

    def tearDown(self):
        # Switch back to main frame before Marionette loses track bug #840931
        self.marionette.switch_to_frame()

        # In case an assertion fails this will still kill the call
        # An open call creates problems for future tests
        self.data_layer.kill_active_call()

        # Also ask Plivo to kill the call if needed
        if self.call_uuid:
            self.plivo.hangup_call(self.call_uuid)

        GaiaTestCase.tearDown(self)
