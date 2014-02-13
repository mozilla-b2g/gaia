# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.cost_control.app import CostControl
from gaiatest.apps.cost_control.regions.ftu_step3 import FTUStep3


class FTUStep2(CostControl):

    _view_locator = (By.ID, 'non-vivo-step-1')
    _reset_report_period_select_locator = (By.CSS_SELECTOR, '#non-vivo-step-1 ul li:nth-child(1) span')
    _next_button_locator = (By.CSS_SELECTOR, '#non-vivo-step-1 span[data-l10n-id="next"]')

    def __init__(self, marionette):
        CostControl.__init__(self, marionette)
        view = self.marionette.find_element(*self._view_locator)
        self.wait_for_condition(lambda m: view.location['x'] == 0)

    def select_reset_report_value(self, value):
        self.marionette.find_element(
            *self._reset_report_period_select_locator).tap()
        self.select(value)
        self.switch_to_ftu()

    def tap_next(self):
        self.marionette.find_element(*self._next_button_locator).tap()
        return FTUStep3(self.marionette)
