# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait
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
    def is_mobile_data_tracking_on(self):
        element = self.marionette.find_element(*self._mobile_data_tracking_locator)
        return self.is_custom_element_checked(element)

    @property
    def is_wifi_data_tracking_on(self):
        wifiswitch = self.marionette.find_element(*self._wifi_data_tracking_locator)
        return wifiswitch.is_selected()

    @property
    def mobile_data_usage_figure(self):
        return self.marionette.find_element(*self._mobile_data_usage_figure_locator).text

    @property
    def wifi_data_usage_figure(self):
        return self.marionette.find_element(*self._wifi_data_usage_figure_locator).text

    def run_ftu_accepting_defaults(self):
        """Complete the 3 steps of the Usage app's FTU accepting all default values."""
        from gaiatest.apps.cost_control.regions.ftu_step1 import FTUStep1
        ftu_step1 = FTUStep1(self.marionette)
        ftu_step2 = ftu_step1.tap_next()
        ftu_step3 = ftu_step2.tap_next()
        ftu_step3.tap_lets_go()

    def tap_settings(self):
        settings = Wait(self.marionette).until(
            expected.element_present(*self._settings_button_locator))
        Wait(self.marionette).until(expected.element_displayed(settings))
        settings.tap()
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
        Wait(self.marionette).until(
            lambda m: 'non-ready' not in ftu_iframe.get_attribute('class') and
            ftu_iframe.is_displayed())
        self.marionette.switch_to_frame(ftu_iframe)
