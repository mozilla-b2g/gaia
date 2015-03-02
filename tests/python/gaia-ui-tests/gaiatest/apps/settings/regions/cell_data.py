# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base
from gaiatest.apps.settings.regions.cell_data_prompt import CellDataPrompt


class CellData(Base):

    _carrier_name_locator = (By.CSS_SELECTOR, '#menuItem-carrier-sim1 small')
    _cell_data_enabled_input_locator = (By.CSS_SELECTOR, '#menuItem-enableDataCall input')
    _cell_data_enabled_label_locator = (By.CSS_SELECTOR, '#menuItem-enableDataCall label')
    _menuItem_carrier_sim1_locator = (By.ID, "menuItem-carrier-sim1")
    _menuItem_carrier_sim2_locator = (By.ID, "menuItem-carrier-sim2")

    @property
    def carrier_name(self):
        element = Wait(self.marionette).until(
            expected.element_present(*self._carrier_name_locator))
        Wait(self.marionette).until(expected.element_displayed(element))
        return element.text

    @property
    def is_data_toggle_checked(self):
        return self.marionette.find_element(*self._cell_data_enabled_input_locator).is_selected()

    def enable_data(self):
        element = Wait(self.marionette).until(
            expected.element_present(*self._cell_data_enabled_label_locator))
        Wait(self.marionette).until(expected.element_displayed(element))
        element.tap()
        return CellDataPrompt(self.marionette)

    def select_sim(self, sim):
        locators = [self._menuItem_carrier_sim1_locator,
                    self._menuItem_carrier_sim2_locator]
        element = Wait(self.marionette).until(
            expected.element_present(*locators[sim]))
        Wait(self.marionette).until(expected.element_dispayed(element))
        element.tap()
