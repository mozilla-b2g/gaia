# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base
from gaiatest.apps.base import PageRegion
from gaiatest.apps.settings.app import Settings
from gaiatest.apps.system.app import System


class UtilityTray(Base):
    _notifications_locator = (By.ID, 'utility-tray-notifications')
    _desktop_notifications_locator = (By.CSS_SELECTOR, '#desktop-notifications-container .notification')
    _notification_clear_locator = (By.ID, 'notification-clear')
    _quicksettings_app_locator = (By.ID, 'quick-settings-full-app')
    _grippy_locator = (By.ID, 'utility-tray-grippy')
    _quick_settings_full_app_locator = (By.ID, 'quick-settings-full-app')

    def wait_for_notification_container_displayed(self):
        # Marionette cannot read the displayed state of the notification
        # container so we wait for the gripper to reach its expanded state
        utility_tray = self.marionette.find_element(*self._notifications_locator)
        grippy = self.marionette.find_element(*self._grippy_locator)
        Wait(self.marionette).until(lambda m: grippy.location['y'] == utility_tray.size['height'])

    @property
    def notifications(self):
        return [Notification(self.marionette, notification)
                for notification in self.marionette.find_elements(*self._desktop_notifications_locator)]

    def clear_all_notifications(self):
        self.marionette.find_element(*self._notification_clear_locator).tap()

    def a11y_clear_all_notifications(self):
        self.accessibility.click(self.marionette.find_element(*self._notification_clear_locator))

    def tap_settings_button(self):
        self.marionette.find_element(*self._quicksettings_app_locator).tap()

    def a11y_wheel_utility_tray_grippy(self):
        self.accessibility.wheel(self.marionette.find_element(*self._grippy_locator), 'up')
        Wait(self.marionette).until(
            expected.element_not_displayed(*System(self.marionette)._utility_tray_locator))

    def a11y_click_quick_settings_full_app(self):
        self.accessibility.click(self.marionette.find_element(
            *self._quick_settings_full_app_locator))
        return Settings(self.marionette)


class Notification(PageRegion):
    _body_locator = (By.CSS_SELECTOR, 'div.detail')
    _title_locator = (By.CSS_SELECTOR, 'div.title')

    @property
    def title(self):
        return self.root_element.find_element(*self._title_locator).text

    @property
    def content(self):
        return self.root_element.find_element(*self._body_locator).text

    def tap_notification(self):
        self.root_element.find_element(*self._title_locator).tap()
        from gaiatest.apps.email.regions.read_email import ReadEmail
        return ReadEmail(self.marionette)
