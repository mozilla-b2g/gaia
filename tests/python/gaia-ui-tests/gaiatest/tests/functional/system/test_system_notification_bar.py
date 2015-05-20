# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.system.app import System


class TestNotificationBar(GaiaTestCase):

    # notification data
    _notification_title = 'TestNotificationBar_TITLE'
    _notification_body = 'TestNotificationBar_BODY'

    def test_notification_bar(self):
        system = System(self.marionette)

        # Push a notification
        self.marionette.execute_script('new Notification("%s", {body: "%s"});'
                                       % (self._notification_title, self._notification_body))

        system.wait_for_notification_toaster_displayed(for_app='system')

        system.wait_for_notification_toaster_not_displayed()

        # Expand the notification bar
        system.wait_for_status_bar_displayed()
        utility_tray = system.open_utility_tray()

        utility_tray.wait_for_notification_container_displayed()

        notifications = utility_tray.get_notifications(for_app='system')
        self.assertEqual(1, len(notifications), 'Expected one system notification.')
        email = notifications[0].tap_notification()

        # We cannot disable app update yet so let's wait for it to pass
        if system.is_app_update_notification_displayed:
            system.wait_for_app_update_to_clear()

        # Clear the notification by "Clear all"
        utility_tray.clear_all_notifications()

        # wait for the notifications to be cleared
        self.wait_for_condition(lambda m: len(utility_tray.notifications) == 0)

        # Assert there is no notification is listed in notifications-container
        self.assertEqual(0, len(utility_tray.notifications))
