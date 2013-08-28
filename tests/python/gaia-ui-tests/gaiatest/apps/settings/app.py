# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.base import Base


class Settings(Base):

    name = 'Settings'

    _header_text_locator = (By.CSS_SELECTOR, '#root > header > h1')
    _data_text_locator = (By.ID, 'data-desc')
    _airplane_switch_locator = (By.XPATH, "//input[@name='ril.radio.disabled']/..")
    _wifi_text_locator = (By.ID, 'wifi-desc')
    _gps_enabled_locator = (By.XPATH, "//input[@name='geolocation.enabled']")
    _gps_switch_locator = (By.XPATH, "//input[@name='geolocation.enabled']/..")
    _cell_data_menu_item_locator = (By.ID, 'menuItem-cellularAndData')
    _bluetooth_menu_item_locator = (By.ID, 'menuItem-bluetooth')
    _keyboard_menu_item_locator = (By.ID, "menuItem-keyboard")
    _language_menu_item_locator = (By.ID, 'menuItem-languageAndRegion')
    _do_not_track_menu_item_locator = (By.ID, 'menuItem-doNotTrack')
    _media_storage_menu_item_locator = (By.ID, 'menuItem-mediaStorage')
    _phone_lock_menu_item_locator = (By.ID, 'menuItem-phoneLock')
    _display_menu_item_locator = (By.ID, 'menuItem-display')
    _wifi_menu_item_locator = (By.ID, 'menuItem-wifi')

    def launch(self):
        Base.launch(self)
        self.wait_for_element_displayed(*self._airplane_switch_locator)

    def enable_airplane_mode(self):
        self.marionette.find_element(*self._airplane_switch_locator).tap()

    def disable_airplane_mode(self):
        self.marionette.find_element(*self._airplane_switch_locator).tap()

    def enable_gps(self):
        self.marionette.find_element(*self._gps_switch_locator).tap()
        self.wait_for_condition(lambda m: self.is_gps_enabled)

    def disable_gps(self):
        self.marionette.find_element(*self._gps_switch_locator).tap()
        self.wait_for_condition(lambda m: not self.is_gps_enabled)

    @property
    def is_gps_enabled(self):
        return self.marionette.find_element(*self._gps_enabled_locator).get_attribute('checked')

    @property
    def header_text(self):
        return self.marionette.find_element(*self._header_text_locator).text

    @property
    def cell_data_menu_item_description(self):
        return self.marionette.find_element(*self._data_text_locator).text

    @property
    def wifi_menu_item_description(self):
        return self.marionette.find_element(*self._wifi_text_locator).text

    def open_cell_and_data_settings(self):
        from gaiatest.apps.settings.regions.cell_data import CellData
        self._tap_menu_item(self._cell_data_menu_item_locator)
        return CellData(self.marionette)

    def open_bluetooth_settings(self):
        from gaiatest.apps.settings.regions.bluetooth import Bluetooth
        self._tap_menu_item(self._bluetooth_menu_item_locator)
        return Bluetooth(self.marionette)

    def open_keyboard_settings(self):
        from gaiatest.apps.settings.regions.keyboard import Keyboard
        self._tap_menu_item(self._keyboard_menu_item_locator)
        return Keyboard(self.marionette)

    def open_language_settings(self):
        from gaiatest.apps.settings.regions.language import Language
        self._tap_menu_item(self._language_menu_item_locator)
        return Language(self.marionette)

    def open_do_not_track_settings(self):
        from gaiatest.apps.settings.regions.do_not_track import DoNotTrack
        self._tap_menu_item(self._do_not_track_menu_item_locator)
        return DoNotTrack(self.marionette)

    def open_media_storage_settings(self):
        from gaiatest.apps.settings.regions.media_storage import MediaStorage
        self._tap_menu_item(self._media_storage_menu_item_locator)
        return MediaStorage(self.marionette)

    def open_phone_lock_settings(self):
        from gaiatest.apps.settings.regions.phone_lock import PhoneLock
        self._tap_menu_item(self._phone_lock_menu_item_locator)
        return PhoneLock(self.marionette)

    def open_display_settings(self):
        from gaiatest.apps.settings.regions.display import Display
        self._tap_menu_item(self._display_menu_item_locator)
        return Display(self.marionette)

    def open_wifi_settings(self):
        from gaiatest.apps.settings.regions.wifi import Wifi
        self._tap_menu_item(self._wifi_menu_item_locator)
        return Wifi(self.marionette)

    def _tap_menu_item(self, menu_item_locator):
        self.wait_for_element_displayed(*menu_item_locator)
        menu_item = self.marionette.find_element(*menu_item_locator)
        # TODO bug 878017 - remove the explicit scroll once bug is fixed
        self.marionette.execute_script("arguments[0].scrollIntoView(false);", [menu_item])
        menu_item.tap()
        self.wait_for_condition(lambda m: menu_item.location['x'] + menu_item.size['width'] == 0)
