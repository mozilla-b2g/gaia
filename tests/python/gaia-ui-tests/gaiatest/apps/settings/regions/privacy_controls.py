# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base


class PrivacyControls(Base):
    _page_locator = (By.ID, 'root')
    _close_tour_header_locator = (By.CLASS_NAME, 'gt-header')
    _location_accuracy_menu_locator = (By.ID, 'menu-item-ala')
    _remote_protection_menu_locator = (By.ID, 'menu-item-rp')
    _trans_control_locator = (By.ID, 'menu-item-tc')
    _about_btn_locator = (By.CLASS_NAME, 'pp-link')
    _about_back_header_locator = (By.CSS_SELECTOR, '[data-l10n-id="about-privacy-controls"]')

    def __init__(self, marionette):
        Base.__init__(self, marionette)

    @property
    def screen_element(self):
        return self.marionette.find_element(*self._page_locator)

    def tap_close_tour(self):
        Wait(self.marionette, timeout=10).until(
            expected.element_displayed(*self._close_tour_header_locator))
        self.marionette.find_element(*self._close_tour_header_locator).tap(25, 25)
        Wait(self.marionette, timeout = 10).until(
            expected.element_displayed(*self._location_accuracy_menu_locator))

    def tap_about(self):
        self.marionette.find_element(*self._about_btn_locator).tap()
        Wait(self.marionette).until(expected.element_displayed(*self._about_back_header_locator))

    def exit_about(self):
        self.marionette.find_element(*self._about_back_header_locator).tap(25, 25)
        Wait(self.marionette).until(expected.element_displayed(*self._location_accuracy_menu_locator))

    def tap_loc_accuracy(self):
        self.marionette.find_element(*self._location_accuracy_menu_locator).tap()
        return self.LocationAccuracy(self.marionette)

    def tap_remote_protect(self):
        self.marionette.find_element(*self._remote_protection_menu_locator).tap()
        return self.RemoteProtection(self.marionette)

    def tap_trans_control(self):
        self.marionette.find_element(*self._trans_control_locator).tap()
        return self.TransparencyControl(self.marionette)

    class LocationAccuracy(Base):
        _page_locator = (By.ID, 'ala-main')
        _loc_adjust_enable_locator = (By.CLASS_NAME, 'show-when-geolocation-on')
        _loc_selection_locator = (By.NAME, 'geolocation.type')
        _ok_locator = (By.CLASS_NAME, 'value-option-confirm')
        _add_exceptions_menu_locator = (By.CSS_SELECTOR, '[data-l10n-id="add-exceptions"]')
        _exception_app_list = (By.ID, 'app-list')
        _first_app_locator = (By.CSS_SELECTOR, '#app-list > li:nth-child(2) > a:nth-child(1)')
        _app_info_locator = (By.CLASS_NAME, 'app-info')
        _app_view_locator = (By.ID, 'ala-exception')

        # no choice since the unique ID is being reused
        _global_settings_locator = \
        (By.CSS_SELECTOR,
         '#ala-exception > div:nth-child(2) > ul:nth-child(1) > li:nth-child(3) > p:nth-child(1) > span:nth-child(1)')

        def __init__(self, marionette):
            Base.__init__(self, marionette)
            Wait(self.marionette).until(
                expected.element_displayed(*self._page_locator))

        @property
        def screen_element(self):
            return self.marionette.find_element(*self._page_locator)

        @property
        def applist_screen_element(self):
            return self.marionette.find_element(*self._exception_app_list)

        def switch_loc_adjustment(self):
            self.marionette.find_element(*self._loc_adjust_enable_locator).tap()
            Wait(self.marionette).until(
                expected.element_displayed(*self._add_exceptions_menu_locator))

        def tap_adjustment_selection(self):
            self.marionette.find_element(*self._loc_selection_locator).tap()
            self.marionette.switch_to_frame()
            Wait(self.marionette).until(
                expected.element_displayed(*self._ok_locator))

        def tap_adjustment_ok(self):
            self.marionette.find_element(*self._ok_locator).tap()
            self.apps.switch_to_displayed_app()
            Wait(self.marionette).until(
                expected.element_displayed(*self._page_locator))

        def tap_add_exception(self):
            self.marionette.find_element(*self._add_exceptions_menu_locator).tap()
            Wait(self.marionette).until(
                expected.element_displayed(*self._exception_app_list))

        def tap_first_app(self):
            self.marionette.find_element(*self._first_app_locator).tap()
            Wait(self.marionette).until(
                expected.element_displayed(*self._app_info_locator))

        def tap_global_settings(self):
            self.marionette.find_element(*self._global_settings_locator).tap()
            self.marionette.switch_to_frame()
            Wait(self.marionette).until(
                expected.element_displayed(*self._ok_locator))

        def tap_global_settings_ok(self):
            self.marionette.find_element(*self._ok_locator).tap()
            self.apps.switch_to_displayed_app()
            Wait(self.marionette).until(
                expected.element_displayed(*self._global_settings_locator))


    class RemoteProtection(Base):
        _page_locator = (By.ID, 'rp-main')

        def __init__(self, marionette):
            Base.__init__(self, marionette)
            Wait(self.marionette).until(
                expected.element_displayed(*self._page_locator))


    class TransparencyControl(Base):
        _page_locator = (By.ID, 'tc-main')
        _app_menu_locator = (By.CSS_SELECTOR, '[data-l10n-id="tc-applications"]')
        _app_view_locator = (By.ID, 'tc-applications')
        _app_order_selector_locator = (By.ID, 'tc-sortKey')
        _ok_locator = (By.CLASS_NAME, 'value-option-confirm')
        _permissions_menu_locator = (By.CSS_SELECTOR, '[data-l10n-id="tc-permissions"]')
        _permissions_view_locator = (By.ID, 'tc-permissions')
        _first_app_locator = (By.CSS_SELECTOR, '[data-key="Bluetooth"]')
        _impl_perm_text_locator = (By.CSS_SELECTOR, '[data-l10n-id="tc-implicit-permissions"]')
        _first_permission_locator = (By.CSS_SELECTOR, '[data-key="alarms"]')
        _access_app_text_locator = (By.CSS_SELECTOR, '[data-l10n-id="tc-apps-accessing-permission"]')

        def __init__(self, marionette):
            Base.__init__(self, marionette)
            Wait(self.marionette).until(
                expected.element_displayed(*self._page_locator))

        @property
        def screen_element(self):
            return self.marionette.find_element(*self._page_locator)

        @property
        def apps_screen_element(self):
            return self.marionette.find_element(*self._app_view_locator)

        @property
        def perm_screen_element(self):
            return self.marionette.find_element(*self._permissions_view_locator)

        def tap_applications(self):
            self.marionette.find_element(*self._app_menu_locator).tap()
            Wait(self.marionette).until(
                expected.element_displayed(*self._app_view_locator))

        def tap_first_app_in_list(self):
            self.marionette.find_element(*self._first_app_locator).tap()
            Wait(self.marionette).until(
                expected.element_displayed(*self._impl_perm_text_locator))

        def tap_first_perm_in_list(self):
            self.marionette.find_element(*self._first_permission_locator).tap()
            Wait(self.marionette).until(
                expected.element_displayed(*self._access_app_text_locator))

        def tap_app_order_selection(self):
            self.marionette.find_element(*self._app_order_selector_locator).tap()
            self.marionette.switch_to_frame()
            Wait(self.marionette).until(
                expected.element_displayed(*self._ok_locator))

        def tap_app_order_ok(self):
            self.marionette.find_element(*self._ok_locator).tap()
            self.apps.switch_to_displayed_app()
            Wait(self.marionette).until(
                expected.element_displayed(*self._app_view_locator))

        def tap_permissions(self):
            self.marionette.find_element(*self._permissions_menu_locator).tap()
            Wait(self.marionette).until(
                expected.element_displayed(*self._permissions_view_locator))
