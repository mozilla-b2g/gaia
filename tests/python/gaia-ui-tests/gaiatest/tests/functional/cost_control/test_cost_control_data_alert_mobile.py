# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import Wait

from gaiatest import GaiaTestCase
from gaiatest.apps.search.app import Search
from gaiatest.apps.cost_control.app import CostControl
from gaiatest.apps.system.app import System


class TestCostControlDataAlertMobile(GaiaTestCase):

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
        settings.enable_data_alert_switch()
        settings.reset_mobile_usage()
        settings.select_when_use_is_above_unit_and_value(u'MB', '0.1')
        settings.tap_done()
        self.assertTrue(cost_control.is_mobile_data_tracking_on)

        # open browser to get some data downloaded
        search = Search(self.marionette)
        search.launch(launch_timeout=30000)
        search.go_to_url('http://mozqa.com/qa-testcase-data/Images/sample_png_02.png')

        system = System(self.marionette)
        # We could have waited on the page to be loaded, but the toaster can appear before
        # the end of the load. That's why the timeout is expanded, the webpage loaded just above
        # might take longer.
        system.wait_for_notification_toaster_displayed(timeout=180)
        system.wait_for_notification_toaster_not_displayed()
        utility_tray = system.open_utility_tray()
        utility_tray.wait_for_notification_container_displayed()

        cost_control_widget = utility_tray.cost_control_widget
        cost_control_widget.wait_for_limit_to_be_reached()
        cost_control_widget.tap()
        Wait(self.marionette).until(lambda m: self.apps.displayed_app.name == cost_control.name)

    def tearDown(self):
        self.marionette.switch_to_frame()
        self.data_layer.disable_cell_data()
        GaiaTestCase.tearDown(self)
