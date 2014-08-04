# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time

from marionette.by import By
from gaiatest import GaiaTestCase
from gaiatest.apps.system.app import System


class TestNotificationVisibilityAccessibility(GaiaTestCase):

    # notification data
    _notification_title = 'TestNotificationBar_TITLE'
    _notification_body = 'TestNotificationBar_BODY'

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.system = System(self.marionette)

    def test_a11y_notification_visibility(self):

        # By default notification toaster should be invisible to the screen reader.
        self.assertTrue(self.accessibility.is_hidden(self.marionette.find_element(
            *self.system._notification_toaster_locator)))

        # Push a notification
        self.marionette.execute_script('new Notification("%s", {body: "%s"});'
                                       % (self._notification_title, self._notification_body))

        self.system.wait_for_notification_toaster_displayed()

        # Now the notification toaster should be visible to the screen reader.
        self.assertTrue(self.accessibility.is_visible(self.marionette.find_element(
            *self.system._notification_toaster_locator)))

        self.system.wait_for_notification_toaster_not_displayed()

        # Again the notification toaster should be invisible to the screen reader.
        self.assertTrue(self.accessibility.is_hidden(self.marionette.find_element(
            *self.system._notification_toaster_locator)))
