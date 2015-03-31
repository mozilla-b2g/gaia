# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from marionette.marionette import Actions
from gaiatest.apps.base import Base


class System(Base):

    # status bar
    _status_bar_locator = (By.ID, 'statusbar')
    _geoloc_statusbar_locator = (By.CSS_SELECTOR, '#statusbar-minimized-wrapper #statusbar-geolocation')
    _airplane_mode_statusbar_locator = (By.CSS_SELECTOR, '#statusbar-minimized-wrapper #statusbar-flight-mode')
    _utility_tray_locator = (By.ID, 'utility-tray')

    _system_banner_locator = (By.CSS_SELECTOR, '.banner.generic-dialog')
    _notification_toaster_locator = (By.ID, 'notification-toaster')
    _update_manager_toaster_locator = (By.ID, 'update-manager-toaster')

    _software_home_button_locator = (By.ID, 'software-home-button')

    _software_buttons_locator = (By.ID, 'software-buttons')
    _screen_locator = (By.ID, 'screen')

    @property
    def status_bar(self):
        self.marionette.switch_to_frame()
        from gaiatest.apps.system.regions.status_bar import StatusBar
        element = self.marionette.find_element(*self._status_bar_locator)
        return StatusBar(self.marionette, element)

    def wait_for_status_bar_displayed(self):
        self.wait_for_element_displayed(*self._status_bar_locator)

    def wait_for_notification_toaster_displayed(self, timeout=10, message=None):
        self.wait_for_element_displayed(*self._notification_toaster_locator,
                                        timeout=timeout, message=message)

    def wait_for_notification_toaster_not_displayed(self, timeout=10):
        self.wait_for_element_not_displayed(*self._notification_toaster_locator,
                                            timeout=timeout)

    def wait_for_system_banner_displayed(self):
        self.wait_for_element_displayed(*self._system_banner_locator)

    def wait_for_system_banner_not_displayed(self):
        self.wait_for_element_not_displayed(*self._system_banner_locator)

    def wait_for_software_home_button_displayed(self, timeout=10, message=None):
        self.wait_for_element_displayed(*self._software_home_button_locator)

    def wait_for_software_home_button_not_displayed(self, timeout=10):
        self.wait_for_element_not_displayed(*self._software_home_button_locator)

    def open_utility_tray(self):
        body = self.marionette.find_element(By.TAG_NAME, 'body')
        statusbar = self.marionette.find_element(*self._status_bar_locator)
        statusbar_x = int(statusbar.size['width']/2)
        statusbar_y_end = int(body.size['height'])
        Actions(self.marionette).press(statusbar).move_by_offset(statusbar_x, statusbar_y_end).release().perform()

        from gaiatest.apps.system.regions.utility_tray import UtilityTray
        return UtilityTray(self.marionette)

    # As we have trouble disabling the app update toaster these methods
    # may be used to wait for it when we know it may interfere
    @property
    def is_app_update_notification_displayed(self):
        update_manager_toaster = self.marionette.find_element(*self._update_manager_toaster_locator)
        return update_manager_toaster.location['y'] > (0 - update_manager_toaster.size['height'])

    def wait_for_app_update_to_clear(self):
        update_manager_toaster = self.marionette.find_element(*self._update_manager_toaster_locator)
        self.wait_for_condition(lambda m: update_manager_toaster.location['y'] == (0 - update_manager_toaster.size['height']))

    def wait_for_geolocation_icon_displayed(self):
        self.wait_for_element_displayed(*self._geoloc_statusbar_locator, timeout=40000)

    def wait_for_airplane_mode_icon_displayed(self):
        self.wait_for_element_displayed(*self._airplane_mode_statusbar_locator)

    @property
    def software_buttons_height(self):
        """
        Gets the height of the software buttons container on the screen.
        Always returns 0 if software buttons are not displayed.
        """
        if 'software-button-enabled' in self.marionette.find_element(*self._screen_locator).get_attribute('class'):
            return self.marionette.find_element(*self._software_buttons_locator).size['height']
        else:
            return 0
