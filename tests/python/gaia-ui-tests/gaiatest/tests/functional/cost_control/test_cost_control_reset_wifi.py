# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time

from gaiatest import GaiaTestCase
from gaiatest.apps.cost_control.app import CostControl
from gaiatest.apps.search.app import Search


class TestCostControlReset(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.apps.set_permission_by_url(Search.manifest_url, 'geolocation', 'deny')

    def test_cost_control_reset_wifi(self):

        self.data_layer.connect_to_wifi()

        cost_control = CostControl(self.marionette)
        cost_control.launch()

        cost_control.switch_to_ftu()
        cost_control.run_ftu_accepting_defaults()

        cost_control.toggle_mobile_data_tracking(False)
        cost_control.toggle_wifi_data_tracking(True)

        # open browser to get some data downloaded
        search = Search(self.marionette)
        search.launch()
        search.go_to_url('http://mozqa.com/data/firefox/layout/mozilla.html')

        self.data_layer.disable_wifi()
        time.sleep(5)

        # go back to Cost Control
        cost_control.launch()
        # if we can't trigger any data usage, there must be something wrong
        self.assertNotEqual(cost_control.wifi_data_usage_figure, u'0.00 B', 'No data usage shown after browsing.')

        # # go to settings section
        settings = cost_control.tap_settings()
        settings.reset_wifi_usage()
        settings.tap_done()

        # wait for usage to be refreshed
        self.wait_for_condition(
            lambda m: cost_control.wifi_data_usage_figure == u'0.00 B',
            message='Wifi usage did not reset back to 0.00 B')
