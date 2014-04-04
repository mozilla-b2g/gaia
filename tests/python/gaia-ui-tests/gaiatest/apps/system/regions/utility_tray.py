# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.base import Base
from gaiatest.apps.base import PageRegion


class UtilityTray(Base):
    _notification_container_locator = (By.ID, 'notifications-container')
    _desktop_notifications_locator = (By.CSS_SELECTOR, '#desktop-notifications-container .notification')
    _notification_clear_locator = (By.ID, 'notification-clear')
    _quicksettings_app_locator = (By.ID, 'quick-settings-full-app')

    def wait_for_notification_container_displayed(self):
        # Marionette cannot read the displayed state of the notification container so we wait for its location
        self.wait_for_condition(lambda m: m.find_element(*self._notification_container_locator).location['y'] == 50)

    @property
    def notifications(self):
        return [Notification(self.marionette, notification)
                for notification in self.marionette.find_elements(*self._desktop_notifications_locator)]

    def clear_all_notifications(self):
        self.marionette.find_element(*self._notification_clear_locator).tap()

    def tap_settings_button(self):
        self.marionette.find_element(*self._quicksettings_app_locator).tap()

class Notification(PageRegion):
    _body_locator = (By.CSS_SELECTOR, 'div.detail')

    @property
    def content(self):
        return self.root_element.find_element(*self._body_locator).text
