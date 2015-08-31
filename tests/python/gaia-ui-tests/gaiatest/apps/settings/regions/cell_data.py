# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base
from gaiatest.apps.settings.regions.cell_data_prompt import CellDataPrompt


class CellData(Base):

    _carrier_container_locator = (By.ID, 'carrier')
    _carrier_name_locator = (By.ID, 'dataNetwork-desc')
    _cell_data_enabled_input_locator = (By.CSS_SELECTOR, '#menuItem-enableDataCall input')
    _cell_data_enabled_label_locator = (By.CSS_SELECTOR, '#menuItem-enableDataCall label')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        element = self.marionette.find_element(*self._carrier_container_locator)
        Wait(self.marionette).until(lambda m: 'current' in element.get_attribute('class'))

    @property
    def carrier_name(self):
        element = Wait(self.marionette).until(
            expected.element_present(*self._carrier_name_locator))
        Wait(self.marionette).until(expected.element_displayed(element))
        return element.text

    def enable_data(self):
        element = Wait(self.marionette).until(
            expected.element_present(*self._cell_data_enabled_label_locator))
        Wait(self.marionette).until(expected.element_displayed(element))
        element.tap()
        return CellDataPrompt(self.marionette)

    @property
    def is_data_toggle_checked(self):
        return self.marionette.find_element(*self._cell_data_enabled_input_locator).is_selected()


class CellDataDualSim(CellData):

    _carrier_name_locator = (By.CSS_SELECTOR, '#menuItem-carrier-sim1 small')
