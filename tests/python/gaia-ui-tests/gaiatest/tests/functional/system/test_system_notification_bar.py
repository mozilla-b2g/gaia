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
        self.marionette.execute_script('navigator.mozNotification.createNotification("%s", "%s").show();'
                                       % (self._notification_title, self._notification_body))

        system.wait_for_notification_toaster_displayed()

        system.wait_for_notification_toaster_not_displayed()

        # Expand the notification bar
        system.wait_for_status_bar_displayed()
        utility_tray = system.open_utility_tray()

        utility_tray.wait_for_notification_container_displayed()

        # Assert there is one notification is listed in notifications-container
        notifications = utility_tray.notifications
        self.assertEqual(1, len(notifications), 'Expected one notification.')

        # Assert notification is listed in notifications-container
        self.assertEqual(self._notification_body, notifications[0].content)

        # We cannot disable app update yet so let's wait for it to pass
        if system.is_app_update_notification_displayed:
            system.wait_for_app_update_to_clear()

        # Clear the notification by "Clear all"
        utility_tray.clear_all_notifications()

        # wait for the notifications to be cleared
        self.wait_for_condition(lambda m: len(utility_tray.notifications) == 0)

        # Assert there is no notification is listed in notifications-container
        self.assertEqual(0, len(utility_tray.notifications))
