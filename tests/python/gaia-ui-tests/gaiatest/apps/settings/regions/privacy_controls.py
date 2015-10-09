# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base
from gaiatest.form_controls.header import GaiaHeader, HTMLHeader


class PrivacyControls(Base):
    manifest_url = '{}privacy-panel{}/manifest.webapp'.format(Base.DEFAULT_PROTOCOL,Base.DEFAULT_APP_HOSTNAME)

    _header_locator = (By.CSS_SELECTOR, '.current gaia-header')
    _page_locator = (By.ID, 'root')
    _close_tour_header_locator = (By.CLASS_NAME, 'gt-header')
    _location_accuracy_menu_locator = (By.ID, 'menu-item-ala')
    _remote_protection_menu_locator = (By.ID, 'menu-item-rp')
    _trans_control_locator = (By.ID, 'menu-item-tc')
    _about_btn_locator = (By.CLASS_NAME, 'pp-link')
    _about_page_locator = (By.ID, 'about')
    _about_back_header_locator = (By.CSS_SELECTOR, '[data-l10n-id="about-privacy-controls"]')

    def __init__(self, marionette):
        Base.__init__(self, marionette)

    @property
    def screen_element(self):
        return self.marionette.find_element(*self._page_locator)

    @property
    def about_screen_element(self):
        return self.marionette.find_element(*self._about_page_locator)

    def tap_close_tour(self):
        HTMLHeader(self.marionette, self._close_tour_header_locator).go_back()
        Wait(self.marionette, timeout=15).until(
            expected.element_displayed(*self._location_accuracy_menu_locator))

    def tap_about(self):
        self.marionette.find_element(*self._about_btn_locator).tap()
        Wait(self.marionette).until(expected.element_displayed(*self._about_back_header_locator))

    def exit_about(self):
        GaiaHeader(self.marionette, self._about_back_header_locator).go_back()
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

    def return_to_prev_menu(self, parent_view, exit_view, html_header_locator=None):
        if html_header_locator:
            # Used by test_settings_PS_RTL.py
            HTMLHeader(self.marionette, html_header_locator).go_back()
        else:
            GaiaHeader(self.marionette, self._header_locator).go_back()

        Wait(self.marionette).until(lambda m: 'current' not in exit_view.get_attribute('class'))
        Wait(self.marionette).until(lambda m: parent_view.rect['x'] == 0)
        Wait(self.marionette).until(lambda m: 'current' in parent_view.get_attribute('class'))


    class LocationAccuracy(Base):
        _page_locator = (By.ID, 'ala-main')
        _app_locator = (By.CSS_SELECTOR, '[data-manifest-name="Privacy Controls"]')
        _loc_adjust_enable_locator = (By.CLASS_NAME, 'show-when-geolocation-on')
        _loc_selection_locator = (By.NAME, 'geolocation.type')
        _ok_locator = (By.CLASS_NAME, 'value-option-confirm')
        _add_exceptions_menu_locator = (By.CSS_SELECTOR, '[data-l10n-id="add-exceptions"]')
        _exception_app_list = (By.ID, 'ala-exceptions')
        _first_app_locator = (By.CSS_SELECTOR, '#app-list > li:nth-child(2) > a:nth-child(1)')
        _app_info_locator = (By.CLASS_NAME, 'app-info')
        _app_view_locator = (By.ID, 'ala-exception')

        # no choice since the unique ID is being reused
        _global_settings_locator = \
            (By.CSS_SELECTOR,
             '#ala-exception > div:nth-child(2) > ul:nth-child(1) > '
             'li:nth-child(3) > p:nth-child(1) > span:nth-child(1)')

        def __init__(self, marionette):
            Base.__init__(self, marionette)
            page = self.marionette.find_element(*self._page_locator)
            Wait(self.marionette).until(lambda m: page.rect['x'] == 0 and page.is_displayed())

        @property
        def screen_element(self):
            return self.marionette.find_element(*self._page_locator)

        @property
        def applist_screen_element(self):
            return self.marionette.find_element(*self._exception_app_list)

        @property
        def appview_screen_element(self):
            return self.marionette.find_element(*self._app_view_locator)

        def switch_loc_adjustment(self):
            self.marionette.find_element(*self._loc_adjust_enable_locator).tap()
            Wait(self.marionette).until(
                expected.element_displayed(*self._add_exceptions_menu_locator))

        def tap_adjustment_selection(self):
            self.marionette.find_element(*self._loc_selection_locator).tap()
            self.marionette.switch_to_frame()
            app = self.marionette.find_element(*self._app_locator)
            Wait(self.marionette).until(expected.element_displayed(app.find_element(*self._ok_locator)))

        def tap_adjustment_ok(self):
            app = self.marionette.find_element(*self._app_locator)
            app.find_element(*self._ok_locator).tap()
            self.apps.switch_to_displayed_app()
            Wait(self.marionette).until(expected.element_displayed(*self._page_locator))

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
            app = self.marionette.find_element(*self._app_locator)
            Wait(self.marionette).until(expected.element_displayed(app.find_element(*self._ok_locator)))

        def tap_global_settings_ok(self):
            app = self.marionette.find_element(*self._app_locator)
            app.find_element(*self._ok_locator).tap()
            self.apps.switch_to_displayed_app()
            Wait(self.marionette).until(
                expected.element_displayed(*self._global_settings_locator))


    class RemoteProtection(Base):
        _page_locator = (By.ID, 'rp-main')

        def __init__(self, marionette):
            Base.__init__(self, marionette)
            page = self.marionette.find_element(*self._page_locator)
            Wait(self.marionette).until(lambda m: page.rect['x'] == 0 and page.is_displayed())

        @property
        def screen_element(self):
            return self.marionette.find_element(*self._page_locator)


    class TransparencyControl(Base):
        _page_locator = (By.ID, 'tc-main')
        _app_locator = (By.CSS_SELECTOR, '[data-manifest-name="Privacy Controls"]')
        _app_menu_locator = (By.CSS_SELECTOR, '[data-l10n-id="tc-applications"]')
        _app_view_locator = (By.ID, 'tc-applications')
        _app_order_selector_locator = (By.ID, 'tc-sortKey')
        _ok_locator = (By.CLASS_NAME, 'value-option-confirm')
        _permissions_menu_locator = (By.CSS_SELECTOR, '[data-l10n-id="tc-permissions"]')
        _permissions_view_locator = (By.ID, 'tc-permissions')
        _bluetooth_app_locator = (By.XPATH,
                               '//*[contains(@src,"app://bluetooth.gaiamobile.org/")]/ancestor::*[@class="menu-item"]')
        _impl_perm_text_locator = (By.CSS_SELECTOR, '[data-l10n-id="tc-implicit-permissions"]')
        _first_permission_locator = (By.CSS_SELECTOR, '#tc-permList > ul:nth-child(1) > li:nth-child(1) > a:nth-child(1)')
        _access_app_text_locator = (By.CSS_SELECTOR, '[data-l10n-id="tc-apps-accessing-permission"]')
        _app_detail_view_locator = (By.ID, 'tc-appDetails')
        _perm_detail_view_locator = (By.ID, 'tc-permDetails')
        _app_detail_header_locator = (By.CSS_SELECTOR, '#tc-appDetails header')
        _app_list_header_locator = (By.CSS_SELECTOR, '#tc-applications header')

        def __init__(self, marionette):
            Base.__init__(self, marionette)
            page = self.marionette.find_element(*self._page_locator)
            Wait(self.marionette).until(lambda m: page.rect['x'] == 0 and page.is_displayed())

        @property
        def screen_element(self):
            return self.marionette.find_element(*self._page_locator)

        @property
        def apps_screen_element(self):
            return self.marionette.find_element(*self._app_view_locator)

        @property
        def apps_detail_element(self):
            return self.marionette.find_element(*self._app_detail_view_locator)

        @property
        def perm_screen_element(self):
            return self.marionette.find_element(*self._permissions_view_locator)

        @property
        def perm_detail_element(self):
            return self.marionette.find_element(*self._perm_detail_view_locator)

        def tap_applications(self):
            self.marionette.find_element(*self._app_menu_locator).tap()
            Wait(self.marionette).until(
                expected.element_displayed(*self._app_view_locator))

        def tap_first_app_in_list(self):
            self.marionette.find_element(*self._bluetooth_app_locator).tap()
            Wait(self.marionette).until(
                expected.element_displayed(*self._impl_perm_text_locator))

        def tap_first_perm_in_list(self):
            self.marionette.find_element(*self._first_permission_locator).tap()
            Wait(self.marionette).until(
                expected.element_displayed(*self._access_app_text_locator))

        def tap_app_order_selection(self):
            self.marionette.find_element(*self._app_order_selector_locator).tap()
            self.marionette.switch_to_frame()
            app = self.marionette.find_element(*self._app_locator)
            Wait(self.marionette).until(expected.element_displayed(app.find_element(*self._ok_locator)))

        def tap_app_order_ok(self):
            app = self.marionette.find_element(*self._app_locator)
            app.find_element(*self._ok_locator).tap()
            self.apps.switch_to_displayed_app()
            Wait(self.marionette).until(
                expected.element_displayed(*self._app_view_locator))

        def tap_permissions(self):
            self.marionette.find_element(*self._permissions_menu_locator).tap()
            Wait(self.marionette).until(
                expected.element_displayed(*self._permissions_view_locator))
