# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import By, Wait

from gaiatest import GaiaTestCase
from gaiatest.apps.search.app import Search
from gaiatest.apps.cost_control.app import CostControl
from gaiatest.apps.system.app import System


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
        self.assertFalse(settings.is_data_alert_switch_checked)
        settings.toggle_data_alert_switch()
        self.assertTrue(settings.is_data_alert_switch_checked)
        settings.reset_mobile_usage()
        settings.select_when_use_is_above_unit_and_value(u'MB', '0.1')
        settings.tap_done()
        self.assertTrue(cost_control.is_mobile_data_tracking_on)

        # open browser to get some data downloaded
        search = Search(self.marionette)
        search.launch(launch_timeout=30000)
        browser = search.go_to_url('http://mozqa.com/qa-testcase-data/Images/sample_png_02.png')
        browser.wait_for_page_to_load(180)

        browser.switch_to_content()
        Wait(self.marionette, timeout=60).until(lambda m: "sample_png_02.png" in m.title)
        browser.switch_to_chrome()

        system = System(self.marionette)
        utility_tray = system.open_utility_tray()
        utility_tray.wait_for_notification_container_displayed()

        # switch to cost control widget
        usage_iframe = self.marionette.find_element(*self._cost_control_widget_locator)
        self.marionette.switch_to_frame(usage_iframe)

        # make sure the color changed
        # The timeout is increased, because for some reason, it takes some time
        # before the limit view is shown (the browser has to finish loading?)
        usage_view = self.marionette.find_element(*self._data_usage_view_locator)
        Wait(self.marionette, timeout=40).until(lambda m: 'reached-limit' in usage_view.get_attribute('class'),
             message='Data usage bar did not breach limit')
        usage_view.tap()

        self.wait_for_condition(lambda m: self.apps.displayed_app.name == cost_control.name)

    def tearDown(self):
        self.marionette.switch_to_frame()
        self.data_layer.disable_cell_data()
        GaiaTestCase.tearDown(self)
