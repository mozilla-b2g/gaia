# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base


class Settings(Base):

    name = 'Settings'

    _header_text_locator = (By.CSS_SELECTOR, '#root > gaia-header > h1')
    _data_text_locator = (By.ID, 'data-desc')
    _wifi_text_locator = (By.ID, 'wifi-desc')
    _battery_text_locator = (By.ID, 'battery-desc')
    _application_storage_text_locator = (By.CSS_SELECTOR, '.application-storage-desc')
    _media_storage_text_locator = (By.ID, 'media-storage-desc')
    _usb_storage_text_locator = (By.CSS_SELECTOR, '.usb-desc')
    _screen_lock_text_locator = (By.CSS_SELECTOR, '.screenLock-desc')
    _language_text_locator = (By.ID, 'language-desc')
    _bluetooth_text_locator = (By.CSS_SELECTOR, '.bluetooth-desc')

    _app_loaded_locator = (By.CSS_SELECTOR, 'body[data-ready="true"]')
    _airplane_switch_locator = (By.XPATH, "//input[contains(@class, 'airplaneMode-input')]/..")
    _airplane_checkbox_locator = (By.CSS_SELECTOR, ".airplaneMode-input")
    _usb_storage_switch_locator = (By.CSS_SELECTOR, ".pack-split.usb-item .pack-switch")
    _usb_storage_checkbox_locator = (By.CSS_SELECTOR, ".usb-switch")
    _usb_storage_confirm_button_locator = (By.CSS_SELECTOR, "button.ums-confirm-option")
    _gps_enabled_locator = (By.XPATH, "//input[@name='geolocation.enabled']")
    _gps_switch_locator = (By.XPATH, "//input[@name='geolocation.enabled']/..")
    _accessibility_menu_item_locator = (By.ID, 'menuItem-accessibility')
    _cell_data_menu_item_locator = (By.ID, 'menuItem-cellularAndData')
    _bluetooth_menu_item_locator = (By.CSS_SELECTOR, '.menuItem-bluetooth')
    _sound_menu_item_locator = (By.ID, 'menuItem-sound')
    _keyboard_menu_item_locator = (By.ID, "menuItem-keyboard")
    _language_menu_item_locator = (By.CSS_SELECTOR, '.menuItem-languageAndRegion')
    _do_not_track_menu_item_locator = (By.ID, 'menuItem-doNotTrack')
    _media_storage_menu_item_locator = (By.CSS_SELECTOR, '.menuItem-mediaStorage')
    _screen_lock_menu_item_locator = (By.ID, 'menuItem-screenLock')
    _display_menu_item_locator = (By.ID, 'menuItem-display')
    _wifi_menu_item_locator = (By.ID, 'menuItem-wifi')
    _device_info_menu_item_locator = (By.ID, 'menuItem-deviceInfo')
    _battery_menu_item_locator = (By.CSS_SELECTOR, '.menuItem-battery')
    _sim_manager_menu_item_locator = (By.ID, 'menuItem-simManager')
    _date_and_time_menu_item_locator = (By.ID, 'menuItem-dateAndTime')
    _homescreen_menu_item_locator = (By.ID, 'menuItem-homescreen')
    _browsing_privacy_item_locator = (By.ID, 'menuItem-browsingPrivacy')
    _findmydevice_locator = (By.ID, 'menuItem-findmydevice')

    def launch(self):
        Base.launch(self)
        Wait(self.marionette).until(
            expected.element_present(*self._app_loaded_locator))

    def switch_to_settings_app(self):
        Wait(self.marionette).until(
            lambda m: self.apps.displayed_app.name == self.name)
        self.apps.switch_to_displayed_app()

    def wait_for_airplane_toggle_ready(self):
        self._wait_for_toggle_ready(*self._airplane_checkbox_locator)

    def toggle_airplane_mode(self):
        checkbox = self.marionette.find_element(*self._airplane_checkbox_locator)
        label = self.marionette.find_element(*self._airplane_switch_locator)
        state = checkbox.is_selected()
        label.tap()
        Wait(self.marionette).until(lambda m: state is not checkbox.is_selected())

    def wait_for_usb_storage_toggle_ready(self):
        self._wait_for_toggle_ready(*self._usb_storage_checkbox_locator)

    def toggle_usb_storage(self):
        # The left hand side of the usb storage switch is overlayed by menuItem-enableStorage
        # So we do the tapping on the right hand side
        element = self.marionette.find_element(*self._usb_storage_switch_locator)
        element.tap(x=(element.size['width']-5))

    @property
    def is_usb_storage_enabled(self):
        return self.marionette.find_element(*self._usb_storage_checkbox_locator).is_selected()

    def confirm_usb_storage(self):
        element = Wait(self.marionette).until(
            expected.element_present(
                *self._usb_storage_confirm_button_locator))
        Wait(self.marionette).until(expected.element_displayed(element))
        element.tap()

    def enable_gps(self):
        self.marionette.find_element(*self._gps_switch_locator).tap()
        checkbox = self.marionette.find_element(*self._gps_enabled_locator)
        Wait(self.marionette).until(expected.element_selected(checkbox))

    def disable_gps(self):
        self.marionette.find_element(*self._gps_switch_locator).tap()
        checkbox = self.marionette.find_element(*self._gps_enabled_locator)
        Wait(self.marionette).until(expected.element_not_selected(checkbox))

    @property
    def is_gps_enabled(self):
        return self.marionette.find_element(
            *self._gps_enabled_locator).is_selected()

    @property
    def header_text(self):
        return self.marionette.find_element(*self._header_text_locator).text

    @property
    def cell_data_menu_item_description(self):
        return self.marionette.find_element(*self._data_text_locator).text

    @property
    def wifi_menu_item_description(self):
        return self.marionette.find_element(*self._wifi_text_locator).text

    @property
    def battery_menu_item_description(self):
        return self.marionette.find_element(*self._battery_text_locator).text

    @property
    def application_storage_menu_item_description(self):
        return self.marionette.find_element(*self._application_storage_text_locator).text

    @property
    def media_storage_menu_item_description(self):
        return self.marionette.find_element(*self._media_storage_text_locator).text

    @property
    def usb_storage_menu_item_description(self):
        return self.marionette.find_element(*self._usb_storage_text_locator).text

    @property
    def screen_lock_menu_item_description(self):
        return self.marionette.find_element(*self._screen_lock_text_locator).text

    @property
    def language_menu_item_description(self):
        return self.marionette.find_element(*self._language_text_locator).text

    @property
    def bluetooth_menu_item_description(self):
        return self.marionette.find_element(*self._bluetooth_text_locator).text

    def a11y_open_accessibility_settings(self):
        from gaiatest.apps.settings.regions.accessibility import Accessibility
        self._a11y_click_menu_item(self._accessibility_menu_item_locator)
        return Accessibility(self.marionette)

    def open_cell_and_data_settings(self):
        from gaiatest.apps.settings.regions.cell_data import CellData
        self._tap_menu_item(self._cell_data_menu_item_locator)
        return CellData(self.marionette)

    def open_bluetooth_settings(self):
        from gaiatest.apps.settings.regions.bluetooth import Bluetooth
        self._tap_menu_item(self._bluetooth_menu_item_locator)
        return Bluetooth(self.marionette)

    def open_sound_settings(self):
        from gaiatest.apps.settings.regions.sound import Sound
        self._tap_menu_item(self._sound_menu_item_locator)
        return Sound(self.marionette)

    def open_keyboard_settings(self):
        from gaiatest.apps.settings.regions.keyboard import Keyboard
        self._tap_menu_item(self._keyboard_menu_item_locator)
        return Keyboard(self.marionette)

    def open_language_settings(self):
        from gaiatest.apps.settings.regions.language import Language
        self._tap_menu_item(self._language_menu_item_locator)
        language_menu = Language(self.marionette)
        language_menu.wait_for_languages_to_load()
        return language_menu

    def open_do_not_track_settings(self):
        from gaiatest.apps.settings.regions.do_not_track import DoNotTrack
        self._tap_menu_item(self._do_not_track_menu_item_locator)
        return DoNotTrack(self.marionette)

    def open_media_storage_settings(self):
        from gaiatest.apps.settings.regions.media_storage import MediaStorage
        self._tap_menu_item(self._media_storage_menu_item_locator)
        return MediaStorage(self.marionette)

    def open_screen_lock_settings(self):
        from gaiatest.apps.settings.regions.screen_lock import ScreenLock
        self._tap_menu_item(self._screen_lock_menu_item_locator)
        return ScreenLock(self.marionette)

    def open_display_settings(self):
        from gaiatest.apps.settings.regions.display import Display
        self._tap_menu_item(self._display_menu_item_locator)
        return Display(self.marionette)

    def open_wifi_settings(self):
        from gaiatest.apps.settings.regions.wifi import Wifi
        self._tap_menu_item(self._wifi_menu_item_locator)
        return Wifi(self.marionette)

    def open_date_and_time_settings(self):
        from gaiatest.apps.settings.regions.date_and_time import DateAndTime
        self._tap_menu_item(self._date_and_time_menu_item_locator)
        return DateAndTime(self.marionette)

    def open_findmydevice(self):
        from gaiatest.apps.settings.regions.findmydevice import FindMyDevice
        self._tap_menu_item(self._findmydevice_locator)
        return FindMyDevice(self.marionette)

    def open_device_info_settings(self):
        from gaiatest.apps.settings.regions.device_info import DeviceInfo
        self._tap_menu_item(self._device_info_menu_item_locator)
        return DeviceInfo(self.marionette)

    def open_battery_settings(self):
        from gaiatest.apps.settings.regions.battery import Battery
        self._tap_menu_item(self._battery_menu_item_locator)
        return Battery(self.marionette)

    def open_sim_manager_settings(self):
        from gaiatest.apps.settings.regions.sim_manager import SimManager
        self._tap_menu_item(self._sim_manager_menu_item_locator)
        return SimManager(self.marionette)

    def open_homescreen_settings(self):
        from gaiatest.apps.settings.regions.homescreen_settings import HomescreenSettings
        self._tap_menu_item(self._homescreen_menu_item_locator)
        return HomescreenSettings(self.marionette)

    def open_browsing_privacy_settings(self):
        from gaiatest.apps.settings.regions.browsing_privacy import BrowsingPrivacy
        self._tap_menu_item(self._browsing_privacy_item_locator)
        return BrowsingPrivacy(self.marionette)

    @property
    def is_airplane_mode_visible(self):
        return self.is_element_displayed(*self._airplane_switch_locator)

    @property
    def is_wifi_menu_visible(self):
        return self.is_element_displayed(*self._wifi_menu_item_locator)

    @property
    def is_cell_data_menu_visible(self):
        return self.is_element_displayed(*self._cell_data_menu_item_locator)

    def _wait_for_menu_item(self, menu_item_locator):
        menu_item = self.marionette.find_element(*menu_item_locator)

        # Some menu items require some async setup to be completed
        element = menu_item.find_element(By.XPATH, 'ancestor::li')
        Wait(self.marionette).until(
            lambda m: not element.get_attribute('aria-disabled'))

        return menu_item

    def _wait_for_parent_section_not_displayed(self, menu_item):
        section = menu_item.find_element(By.XPATH, 'ancestor::section')
        Wait(self.marionette).until(
            lambda m: section.location['x'] + section.size['width'] == 0)

    def _tap_menu_item(self, menu_item_locator):
        menu_item = self._wait_for_menu_item(menu_item_locator)
        menu_item.tap()
        self._wait_for_parent_section_not_displayed(menu_item)

    def _a11y_click_menu_item(self, menu_item_locator):
        menu_item = self._wait_for_menu_item(menu_item_locator)
        self.accessibility.click(menu_item)
        self._wait_for_parent_section_not_displayed(menu_item)

    def _wait_for_toggle_ready(self, by, locator):
        checkbox = self.marionette.find_element(by, locator)
        Wait(self.marionette).until(expected.element_enabled(checkbox))
