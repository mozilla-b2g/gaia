# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.base import Base


class CostControl(Base):

    name = 'Usage'

    _usage_app_main_locator = (By.ID, 'datausage-tab')
    _usage_app_title_locator = (By.CSS_SELECTOR, 'h1[data-l10n-id="usage"]')
    _settings_button_locator = (By.CSS_SELECTOR, 'button.settings-button')

    _mobile_data_item_locator = (By.ID, 'mobileItem')
    _mobile_data_tracking_locator = (By.ID, 'mobileCheck')
    _mobile_data_label_locator = (By.CSS_SELECTOR, '#mobileItem label')
    _mobile_data_usage_figure_locator = (By.ID, 'mobileOverview')
    _wifi_data_item_locator = (By.ID, 'mobileItem')
    _wifi_data_tracking_locator = (By.ID, 'wifiCheck')
    _wifi_data_label_locator = (By.CSS_SELECTOR, '#wifiItem label')
    _wifi_data_usage_figure_locator = (By.ID, 'wifiOverview')

    # FTE
    _ftu_frame_locator = (By.ID, 'fte_view')
    _ftu_section_locator = (By.ID, 'firsttime-view')

    @property
    def ftu_step1(self):
        from gaiatest.apps.cost_control.regions.ftu_step1 import FTUStep1
        return FTUStep1(self.marionette)

    @property
    def is_mobile_data_tracking_on(self):
        self.wait_for_element_displayed(*self._mobile_data_item_locator)
        mobileswitch = self.marionette.find_element(*self._mobile_data_tracking_locator)
        return mobileswitch.is_selected()

    @property
    def is_wifi_data_tracking_on(self):
        self.wait_for_element_displayed(*self._wifi_data_item_locator)
        wifiswitch = self.marionette.find_element(*self._wifi_data_tracking_locator)
        return wifiswitch.is_selected()

    @property
    def mobile_data_usage_figure(self):
        self.wait_for_element_displayed(*self._mobile_data_usage_figure_locator)
        return self.marionette.find_element(*self._mobile_data_usage_figure_locator).text

    @property
    def wifi_data_usage_figure(self):
        self.wait_for_element_displayed(*self._wifi_data_usage_figure_locator)
        return self.marionette.find_element(*self._wifi_data_usage_figure_locator).text

    def run_ftu_accepting_defaults(self):
        """Complete the 3 steps of the Usage app's FTU accepting all default values."""
        ftu_step1 = self.ftu_step1
        ftu_step2 = ftu_step1.tap_next()
        ftu_step3 = ftu_step2.tap_next()
        ftu_step3.tap_lets_go()
        self.launch()

    def tap_settings(self):
        self.wait_for_element_displayed(*self._settings_button_locator)
        self.marionette.find_element(*self._settings_button_locator).tap()
        from gaiatest.apps.cost_control.regions.settings import Settings
        return Settings(self.marionette)

    def toggle_mobile_data_tracking(self, value):
        if self.is_mobile_data_tracking_on is not value:
            self.marionette.find_element(*self._mobile_data_label_locator).tap()

    def toggle_wifi_data_tracking(self, value):
        if self.is_wifi_data_tracking_on is not value:
            self.marionette.find_element(*self._wifi_data_label_locator).tap()

    def switch_to_ftu(self):
        ftu_iframe = self.marionette.find_element(*self._ftu_frame_locator)
        self.marionette.switch_to_frame(ftu_iframe)
        self.wait_for_element_present(*self._ftu_section_locator)
