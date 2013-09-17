# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.cost_control.app import CostControl


class TestCostControlFTU(GaiaTestCase):

    def test_cost_control_ftu(self):

        cost_control = CostControl(self.marionette)
        cost_control.launch()

        # This will switch to ftu iframe
        cost_control.switch_to_ftu()

        ftu_step1 = cost_control.ftu_step1
        ftu_step2 = ftu_step1.tap_next()

        ftu_step2.select_reset_report_value('Weekly')
        ftu_step3 = ftu_step2.tap_next()

        ftu_step3.toggle_data_alert_switch(True)
        ftu_step3.select_when_use_is_above_unit_and_value(u'MB', '0.1')
        ftu_step3.tap_lets_go()

        self.marionette.switch_to_frame(self.apps.displayed_app.frame)
        self.assertTrue(cost_control.is_mobile_data_tracking_on)
