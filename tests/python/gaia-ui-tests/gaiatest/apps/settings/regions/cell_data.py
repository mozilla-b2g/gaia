# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.base import Base
from gaiatest.apps.settings.regions.cell_data_prompt import CellDataPrompt


class CellData(Base):

    _carrier_name_locator = (By.ID, 'dataNetwork-desc')
    _cell_data_enabled_input_locator = (By.XPATH, "//input[@name='ril.data.enabled']")
    _cell_data_enabled_label_locator = (By.XPATH, "//input[@name='ril.data.enabled']/..")
    _menuItem_carrier_sim1_locator = (By.ID, "menuItem-carrier-sim1")
    _menuItem_carrier_sim2_locator = (By.ID, "menuItem-carrier-sim2")
    _back_button_locator = (By.CSS_SELECTOR, '.current header > a')

    @property
    def carrier_name(self):
        self.wait_for_element_displayed(*self._carrier_name_locator)
        return self.marionette.find_element(*self._carrier_name_locator).text

    @property
    def is_data_toggle_checked(self):
        return self.marionette.find_element(*self._cell_data_enabled_input_locator).get_attribute('checked')

    def enable_data(self):
        self.wait_for_element_displayed(*self._cell_data_enabled_label_locator)
        self.marionette.find_element(*self._cell_data_enabled_label_locator).tap()
        return CellDataPrompt(self.marionette)

    def select_sim(self, sim):
        if sim == 1:
            self.wait_for_element_displayed(*self._menuItem_carrier_sim1_locator)
            self.marionette.find_element(*self._menuItem_carrier_sim1_locator).tap()
        elif sim == 2:
            self.wait_for_element_displayed(*self._menuItem_carrier_sim2_locator)
            self.marionette.find_element(*self._menuItem_carrier_sim2_locator).tap()
        else:
            raise Exception("SIM %s could not be found" % sim)
