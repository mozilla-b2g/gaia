# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest import GaiaTestCase
from gaiatest.apps.system.app import System


class TestUtilityTrayNotificationsAccessibility(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.system = System(self.marionette)

    def test_a11y_utility_tray_notifications(self):
        self.system.wait_for_status_bar_displayed()

        utility_tray = self.system.open_utility_tray()
        utility_tray.wait_for_notification_container_displayed()

        self.marionette.execute_script('new Notification("Title", {body: "Body"});')
        # Assert there is one notification is listed in notifications-container
        notifications = utility_tray.notifications
        self.assertEqual(1, len(notifications), 'Expected one notification.')

        # Clear the notification by "Clear all"
        utility_tray.a11y_clear_all_notifications()

        # wait for the notifications to be cleared
        self.wait_for_condition(lambda m: len(utility_tray.notifications) == 0)
