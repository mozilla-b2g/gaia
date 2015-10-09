# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base
from gaiatest.apps.settings.regions.cell_data_prompt import CellDataPrompt
from gaiatest.form_controls.binarycontrol import GaiaBinaryControl
from gaiatest.apps.settings.regions.sim_settings import SimSettings


class CellData(Base):
    _page_locator = (By.ID, 'carrier')

    _carrier_container_locator = (By.ID, 'carrier')
    _carrier_name_locator = (By.ID, 'dataNetwork-desc')
    _cell_data_enabled_input_locator = (By.CSS_SELECTOR, '#menuItem-enableDataCall gaia-switch')
    _cell_data_enabled_label_locator = (By.CSS_SELECTOR, '#menuItem-enableDataCall label')
    _data_roaming_enabled_input_locator = (By.CSS_SELECTOR, '#menuItem-enableDataRoaming gaia-switch')
    _data_roaming_enabled_label_locator = (By.CSS_SELECTOR, '#menuItem-enableDataRoaming label')
    _sim_1_settings_locator = (By.ID, 'menuItem-carrier-sim1')

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

    @property
    def screen_element(self):
        return self.marionette.find_element(*self._page_locator)

    # workaround for elements within CellDataPrompt going stale (Bug 1202246)
    @property
    def data_prompt(self):
        return CellDataPrompt(self.marionette)

    def enable_data(self):
        element = Wait(self.marionette).until(
            expected.element_present(*self._cell_data_enabled_label_locator))
        Wait(self.marionette).until(expected.element_displayed(element) and expected.element_enabled(element))
        element.tap()
        return self.data_prompt

    def enable_roaming(self):
        element = Wait(self.marionette).until(
            expected.element_present(*self._data_roaming_enabled_label_locator))
        Wait(self.marionette).until(expected.element_displayed(element))
        Wait(self.marionette).until(expected.element_displayed(element) and expected.element_enabled(element))
        element.tap()
        return self.data_prompt

    def tap_sim_1_setting(self):
        element = Wait(self.marionette).until(
            expected.element_present(*self._sim_1_settings_locator))
        Wait(self.marionette).until(expected.element_displayed(element))
        element.tap()
        return SimSettings(self.marionette)

    @property
    def is_data_toggle_checked(self):
        return GaiaBinaryControl(self.marionette, self._cell_data_enabled_input_locator).is_checked

    @property
    def is_roaming_toggle_checked(self):
        return GaiaBinaryControl(self.marionette, self._data_roaming_enabled_input_locator).is_checked

class CellDataDualSim(CellData):

    _carrier_name_locator = (By.CSS_SELECTOR, '#menuItem-carrier-sim1 small')
