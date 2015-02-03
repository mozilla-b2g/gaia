# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

try:
    from marionette.by import By
except:
    from marionette_driver.by import By
from marionette.wait import Wait
from gaiatest import GaiaTestCase
from gaiatest.apps.search.app import Search
from gaiatest.apps.cost_control.app import CostControl


class TestCostControlDataAlertMobile(GaiaTestCase):

    # notification bar locators
    _cost_control_widget_locator = (By.CSS_SELECTOR, '#cost-control-widget > iframe')
    _data_usage_view_locator = (By.ID, 'datausage-limit-view')

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.data_layer.disable_wifi()
        self.data_layer.connect_to_cell_data()

    def test_cost_control_data_alert_mobile(self):
        """https://moztrap.mozilla.org/manage/case/8938/"""

        cost_control = CostControl(self.marionette)
        cost_control.launch()

        cost_control.switch_to_ftu()
        cost_control.run_ftu_accepting_defaults()

        self.assertTrue(cost_control.is_mobile_data_tracking_on)
        self.assertFalse(cost_control.is_wifi_data_tracking_on)

        settings = cost_control.tap_settings()
        settings.toggle_data_alert_switch(True)
        settings.select_when_use_is_above_unit_and_value(u'MB', '0.1')
        settings.reset_mobile_usage()
        settings.tap_done()
        self.assertTrue(cost_control.is_mobile_data_tracking_on)

        # open browser to get some data downloaded
        search = Search(self.marionette)
        search.launch(launch_timeout=30000)
        browser = search.go_to_url('http://www.mozilla.org/')
        browser.wait_for_page_to_load(180)

        browser.switch_to_content()
        Wait(self.marionette, timeout=60).until(lambda m: "Home of the Mozilla Project" in m.title)
        browser.switch_to_chrome()

        # get the notification bar
        self.device.touch_home_button()
        self.marionette.switch_to_frame()
        self.marionette.execute_script("window.wrappedJSObject.UtilityTray.show()")

        # switch to cost control widget
        usage_iframe = self.marionette.find_element(*self._cost_control_widget_locator)
        self.marionette.switch_to_frame(usage_iframe)

        # make sure the color changed
        # The timeout is increased, because for some reason, it takes some time
        # before the limit view is shown (the browser has to finish loading?)
        usage_view = self.marionette.find_element(*self._data_usage_view_locator)
        Wait(self.marionette, timeout=40).until(lambda m: 'reached-limit' in usage_view.get_attribute('class'),
             message='Data usage bar did not breach limit')
