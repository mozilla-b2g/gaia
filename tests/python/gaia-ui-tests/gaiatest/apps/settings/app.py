# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base


class Settings(Base):

    name = 'Settings'

    _bluetooth_l10n_locator = (By.CSS_SELECTOR, '[data-l10n-id="bt-status-turnoff"]')

    _header_locator = (By.CSS_SELECTOR, '.current gaia-header')
    _non_gaia_header_locator = (By.CSS_SELECTOR, '.current header')
    _page_locator = (By.ID, 'root')

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
    _usb_storage_cancel_button_locator = (By.CSS_SELECTOR, "button.ums-cancel-option")
    _gps_enabled_locator = (By.XPATH, "//input[@name='geolocation.enabled']")
    _gps_switch_locator = (By.XPATH, "//input[@name='geolocation.enabled']/..")

    # Following menu item list matches the menu item order in the settings app
    _wifi_menu_item_locator = (By.ID, 'menuItem-wifi')
    _sim_manager_menu_item_locator = (By.ID, 'menuItem-simManager')
    _call_settings_menu_item_locator = (By.ID, 'menuItem-callSettings')
    _message_settings_menu_item_locator = (By.ID, 'menuItem-messagingSettings')
    _cell_data_menu_item_locator = (By.ID, 'menuItem-cellularAndData')
    _bluetooth_menu_item_locator = (By.CSS_SELECTOR, '.menuItem-bluetooth')
    _internet_sharing_menu_item_locator = (By.ID, 'menuItem-internetSharing')

    _sound_menu_item_locator = (By.ID, 'menuItem-sound')
    _display_menu_item_locator = (By.ID, 'menuItem-display')
    _homescreen_menu_item_locator = (By.ID, 'menuItem-homescreen')
    _search_menu_item_locator = (By.ID, 'menuItem-search')
    _navigation_menu_item_locator = (By.ID, 'menuItem-navigation')
    _notification_menu_item_locator = (By.ID, 'menuItem-notifications')
    _date_and_time_menu_item_locator = (By.ID, 'menuItem-dateAndTime')
    _language_menu_item_locator = (By.CSS_SELECTOR, '.menuItem-languageAndRegion')
    _keyboard_menu_item_locator = (By.ID, "menuItem-keyboard")
    _theme_menu_item_locator = (By.ID, "menuItem-themes")
    _addon_menu_item_locator = (By.ID, "menuItem-addons")
    _achievements_menu_item_locator = (By.ID, "achievements-section")

    _firefox_accounts_menu_item_locator = (By.ID, "menuItem-fxa")
    _findmydevice_locator = (By.ID, 'menuItem-findmydevice')

    _screen_lock_menu_item_locator = (By.ID, 'menuItem-screenLock')
    _app_permission_menu_item_locator = (By.ID, 'menuItem-appPermissions')
    _do_not_track_menu_item_locator = (By.ID, 'menuItem-doNotTrack')
    _browsing_privacy_item_locator = (By.ID, 'menuItem-browsingPrivacy')
    _privacy_controls_item_locator = (By.ID, 'menuItem-privacyPanel')
    _media_storage_menu_item_locator = (By.CSS_SELECTOR, '.menuItem-mediaStorage')
    _application_storage_menu_item_locator = (By.CSS_SELECTOR, '.menuItem-applicationStorage')

    _device_info_menu_item_locator = (By.ID, 'menuItem-deviceInfo')
    _downloads_menu_item_locator = (By.ID, 'menuItem-downloads')
    _battery_menu_item_locator = (By.CSS_SELECTOR, '.menuItem-battery')
    _accessibility_menu_item_locator = (By.ID, 'menuItem-accessibility')
    _developer_menu_item_locator = (By.ID, 'menuItem-developer')
    _improve_menu_item_locator = (By.ID, 'menuItem-improveBrowserOS')
    _help_menu_item_locator = (By.ID, 'menuItem-help')

    _main_title_locator = (By.ID, 'main-list-title')

    def launch(self):
        Base.launch(self)
        Wait(self.marionette).until(
            expected.element_present(*self._app_loaded_locator))

        # this is located at the end of the page.  If this is shown, everything is rendered.
        Wait(self.marionette).until(
            expected.element_present(*self._bluetooth_l10n_locator))

    def switch_to_settings_app(self):
        Wait(self.marionette).until(lambda m: self.apps.displayed_app.name == self.name)
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

    def cancel_usb_storage(self):
        element = Wait(self.marionette).until(
            expected.element_present(
                *self._usb_storage_cancel_button_locator))
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

    @property
    def screen_element(self):
        return self.marionette.find_element(*self._page_locator)

    @property
    def title(self):
        return self.marionette.find_element(*self._main_title_locator)

    def open_wifi(self):
        return self._open_subpage(self._wifi_menu_item_locator, 'wifi', 'Wifi')

    def open_sim_manager(self):
        return self._open_subpage(self._sim_manager_menu_item_locator, 'sim_manager', 'SimManager')

    def open_call(self):
        return self._open_subpage(self._call_settings_menu_item_locator)

    def open_message(self):
        return self._open_subpage(self._message_settings_menu_item_locator)

    def open_cell_and_data(self):
        return self._open_subpage(self._cell_data_menu_item_locator, 'cell_data', 'CellData')

    def open_cell_and_data_dual_sim(self):
        return self._open_subpage(self._cell_data_menu_item_locator, 'cell_data', 'CellDataDualSim')

    def open_bluetooth(self):
        return self._open_subpage(self._bluetooth_menu_item_locator, 'bluetooth', 'Bluetooth')

    def open_internet_sharing(self):
        return self._open_subpage(self._internet_sharing_menu_item_locator, 'internet_sharing', 'InternetSharing')

    def open_sound(self):
        return self._open_subpage(self._sound_menu_item_locator, 'sound', 'Sound')

    def open_display(self):
        return self._open_subpage(self._display_menu_item_locator, 'display', 'Display')

    def open_homescreen(self):
        return self._open_subpage(self._homescreen_menu_item_locator, 'homescreen_settings',
                                  'HomescreenSettings')

    def open_search(self):
        return self._open_subpage(self._search_menu_item_locator, 'search', 'Search')

    def open_navigation(self):
        return self._open_subpage(self._navigation_menu_item_locator)

    def open_notification(self):
        return self._open_subpage(self._notification_menu_item_locator)

    def open_date_and_time(self):
        return self._open_subpage(self._date_and_time_menu_item_locator, 'date_and_time', 'DateAndTime')

    def open_language(self):
        language_menu = self._open_subpage(self._language_menu_item_locator, 'language', 'Language')
        language_menu.wait_for_languages_to_load()
        return language_menu

    def open_keyboard(self):
        return self._open_subpage(self._keyboard_menu_item_locator, 'keyboard', 'Keyboard')

    def open_themes(self):
        return self._open_subpage(self._theme_menu_item_locator)

    def open_addons(self):
        return self._open_subpage(self._addon_menu_item_locator, 'addons', 'Addons')

    def open_achievements(self):
        return self._open_subpage(self._achievements_menu_item_locator)

    def open_firefox_accounts(self):
        return self._open_subpage(self._firefox_accounts_menu_item_locator)

    def open_findmydevice(self):
        return self._open_subpage(self._findmydevice_locator, 'findmydevice', 'FindMyDevice')

    def open_screen_lock(self):
        return self._open_subpage(self._screen_lock_menu_item_locator, 'screen_lock', 'ScreenLock')

    def open_app_permissions(self):
        return self._open_subpage(self._app_permission_menu_item_locator, 'app_permission', 'AppPermission')

    def open_do_not_track(self):
        return self._open_subpage(self._do_not_track_menu_item_locator, 'do_not_track', 'DoNotTrack')

    def open_browsing_privacy(self):
        return self._open_subpage(self._browsing_privacy_item_locator, 'browsing_privacy', 'BrowsingPrivacy')

    def open_privacy_controls(self):
        return self._open_subpage(self._privacy_controls_item_locator, 'privacy_controls', 'PrivacyControls')

    def open_media_storage(self):
        return self._open_subpage(self._media_storage_menu_item_locator, 'media_storage', 'MediaStorage')

    def open_application_storage(self):
        return self._open_subpage(self._application_storage_menu_item_locator)

    def open_device_info(self):
        return self._open_subpage(self._device_info_menu_item_locator, 'device_info', 'DeviceInfo')

    def open_downloads(self):
        return self._open_subpage(self._downloads_menu_item_locator)

    def open_battery(self):
        return self._open_subpage(self._battery_menu_item_locator, 'battery', 'Battery')

    def open_accessibility(self):
        return self._open_subpage(self._accessibility_menu_item_locator, 'accessibility', 'Accessibility')

    def open_developer(self):
        return self._open_subpage(self._developer_menu_item_locator)

    def open_improve(self):
        return self._open_subpage(self._improve_menu_item_locator)

    def open_help(self):
        return self._open_subpage(self._help_menu_item_locator)

    def _open_subpage(self, locator, file_name=None, class_name=None):
        self._tap_menu_item(locator)
        class_object = self._get_class_by_name(file_name, class_name)
        if class_object is not None:
            return class_object(self.marionette)

    def _get_class_by_name(self, file_name=None, class_name=None):
        if file_name is not None:
            package_path = 'gaiatest.apps.settings.regions.{}'.format(file_name.lower())
            mod = __import__(package_path, fromlist = [class_name])
            class_defn = getattr(mod, class_name)
            return class_defn

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
        if menu_item_locator != self._privacy_controls_item_locator:
            self._wait_for_parent_section_not_displayed(menu_item)

    def _a11y_click_menu_item(self, menu_item_locator):
        menu_item = self._wait_for_menu_item(menu_item_locator)
        self.accessibility.click(menu_item)
        self._wait_for_parent_section_not_displayed(menu_item)

    def _wait_for_toggle_ready(self, by, locator):
        checkbox = self.marionette.find_element(by, locator)
        Wait(self.marionette).until(expected.element_enabled(checkbox))

    # this method is a copy of go_back() method in regions/keyboard.py
    def return_to_prev_menu(self, parent_view, gaia_header=True):

        # TODO: remove tap with coordinates after Bug 1061698 is fixed
        if gaia_header:
            _back_locator = self._header_locator
        else:
            _back_locator = self._non_gaia_header_locator

        Wait(self.marionette).until(expected.element_displayed(*_back_locator))
        self.marionette.find_element(*_back_locator).tap(25, 25)
        Wait(self.marionette).until(expected.element_displayed(parent_view))
