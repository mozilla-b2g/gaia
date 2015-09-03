# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base
from gaiatest.apps.settings.regions.cell_data_prompt import CellDataPrompt
from gaiatest.apps.settings.regions.sim_settings import SimSettings


class CellData(Base):
    _page_locator = (By.ID, 'carrier')

    _carrier_container_locator = (By.ID, 'carrier')
    _carrier_name_locator = (By.ID, 'dataNetwork-desc')
    _cell_data_enabled_input_locator = (By.CSS_SELECTOR, '#menuItem-enableDataCall input')
    _cell_data_enabled_label_locator = (By.CSS_SELECTOR, '#menuItem-enableDataCall label')
    _data_roaming_enabled_input_locator = (By.CSS_SELECTOR, '#menuItem-enableDataRoaming input')
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

    def enable_data(self):
        element = Wait(self.marionette).until(
            expected.element_present(*self._cell_data_enabled_label_locator))
        Wait(self.marionette).until(expected.element_displayed(element))
        element.tap()
        return CellDataPrompt(self.marionette)

    def enable_roaming(self):
        element = Wait(self.marionette).until(
            expected.element_present(*self._data_roaming_enabled_label_locator))
        Wait(self.marionette).until(expected.element_displayed(element))
        element.tap()
        return CellDataPrompt(self.marionette)

    # this method is for imagecompare tests only.  Since CellDataPrompt is a subclass of PageRegion, taking screeshot
    # within the dialog will make the root_element stale.  For non-imagecompare tests, use CellDataPrompt.turn_on()
    def tap_ok_on_prompt(self):
        _dialog_locator = (By.CSS_SELECTOR, '#settings-confirm-dialog')
        _button_locator = (By.CSS_SELECTOR, 'button[data-l10n-id="turnOn"]')

        self.marionette.find_element(*_button_locator).tap()
        Wait(self.marionette).until(lambda m: self.marionette.find_element(*_dialog_locator).rect['width'] == 0)
        Wait(self.marionette).until(expected.element_displayed(*self._cell_data_enabled_label_locator))

    def tap_sim_1_setting(self):
        element = Wait(self.marionette).until(
            expected.element_present(*self._sim_1_settings_locator))
        Wait(self.marionette).until(expected.element_displayed(element))
        element.tap()
        return SimSettings(self.marionette)

    @property
    def is_data_toggle_checked(self):
        return self.marionette.find_element(*self._cell_data_enabled_input_locator).is_selected()

    @property
    def is_roaming_toggle_checked(self):
        return self.marionette.find_element(*self._data_roaming_enabled_input_locator).is_selected()


class CellDataDualSim(CellData):

    _carrier_name_locator = (By.CSS_SELECTOR, '#menuItem-carrier-sim1 small')
