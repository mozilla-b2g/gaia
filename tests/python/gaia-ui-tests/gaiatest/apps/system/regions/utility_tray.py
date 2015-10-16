# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base
from gaiatest.apps.base import PageRegion
from gaiatest.apps.settings.app import Settings
from gaiatest.apps.system.app import System


class UtilityTray(Base):
    _utility_tray_locator = (By.ID, 'utility-tray')
    _desktop_notifications_locator = (By.CSS_SELECTOR, '#desktop-notifications-container .notification')
    _notification_clear_locator = (By.ID, 'notification-clear')
    _quicksettings_app_locator = (By.ID, 'quick-settings-full-app')
    _grippy_locator = (By.ID, 'utility-tray-grippy')
    _quick_settings_full_app_locator = (By.ID, 'quick-settings-full-app')

    def wait_for_dropped_down(self):
        utility_tray = self.marionette.find_element(*self._utility_tray_locator)
        grippy = self.marionette.find_element(*self._grippy_locator)
        Wait(self.marionette).until(lambda m: (grippy.rect['y'] + grippy.rect['height']) == utility_tray.size['height'])

    @property
    def notifications(self):
        return [Notification(self.marionette, notification)
                for notification in self.marionette.find_elements(*self._desktop_notifications_locator)]

    def get_notifications(self, for_app=None):
        return [Notification(self.marionette, notification)
                for notification in self.marionette.find_elements(*self._desktop_notifications_locator)
                    if for_app is None or for_app in notification.get_attribute('data-manifest-u-r-l')]

    def clear_all_notifications(self):
        self.marionette.find_element(*self._notification_clear_locator).tap()
        Wait(self.marionette).until(lambda m: len(self.notifications) == 0)

    def a11y_clear_all_notifications(self):
        self.accessibility.click(self.marionette.find_element(*self._notification_clear_locator))

    @property
    def cost_control_widget(self):
        return CostControlWidget(self.marionette)

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


class CostControlWidget(Base):
    _cost_control_widget_locator = (By.CSS_SELECTOR, '#cost-control-widget > iframe')
    _data_usage_view_locator = (By.ID, 'datausage-limit-view')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        usage_iframe = self.marionette.find_element(*self._cost_control_widget_locator)
        self.marionette.switch_to_frame(usage_iframe)

    def tap(self):
        self.marionette.find_element(*self._data_usage_view_locator).tap()

    def wait_for_limit_to_be_reached(self):
        usage_view = self.marionette.find_element(*self._data_usage_view_locator)
        Wait(self.marionette, timeout=40).until(lambda m: 'reached-limit' in usage_view.get_attribute('class'))
