# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest import GaiaTestCase
from gaiatest.apps.browser.app import Browser
from gaiatest.apps.cost_control.app import CostControl


class TestCostControlDataAlertMobile(GaiaTestCase):

    # notification bar locators
    _cost_control_widget_locator = (By.CSS_SELECTOR, 'iframe[data-frame-origin="app://costcontrol.gaiamobile.org"]')
    _data_usage_view_locator = (By.ID, 'datausage-limit-view')

    # locator for page loaded in browser
    _page_body_locator = (By.ID, 'home')

    def test_cost_control_data_alert_mobile(self):

        self.data_layer.connect_to_cell_data()
        cost_control = CostControl(self.marionette)
        cost_control.launch()

        cost_control.switch_to_ftu()
        cost_control.run_ftu_accepting_defaults()

        self.assertTrue(cost_control.is_mobile_data_tracking_on)
        self.assertFalse(cost_control.is_wifi_data_tracking_on)

        settings = cost_control.tap_settings()
        settings.toggle_data_alert_switch(True)
        settings.select_when_use_is_above_unit_and_value(u'MB', '0.1')
        settings.reset_data_usage()
        settings.tap_done()
        self.assertTrue(cost_control.is_mobile_data_tracking_on)

        # open browser to get some data downloaded
        browser = Browser(self.marionette)
        browser.launch()
        browser.go_to_url('http://developer.mozilla.org/', timeout=120)
        browser.switch_to_content()
        self.wait_for_element_present(*self._page_body_locator, timeout=120)
        browser.switch_to_chrome()

        # get the notification bar
        self.marionette.switch_to_frame()
        self.marionette.execute_script("window.wrappedJSObject.UtilityTray.show()")

        # switch to cost control widget
        usage_iframe = self.marionette.find_element(*self._cost_control_widget_locator)
        self.marionette.switch_to_frame(usage_iframe)

        # make sure the color changed
        self.wait_for_condition(
            lambda m: 'reached-limit' in self.marionette.find_element(*self._data_usage_view_locator).get_attribute('class'),
            message='Data usage bar did not breach limit'
        )
