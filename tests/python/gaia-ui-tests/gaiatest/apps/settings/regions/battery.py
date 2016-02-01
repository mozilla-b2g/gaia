# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time

from marionette_driver import expected, By, Wait
from gaiatest.apps.base import Base
from gaiatest.form_controls.binarycontrol import GaiaBinaryControl


class Battery(Base):

    _page_locator = (By.ID, 'battery')

    _power_save_checkbox_locator = (By.CSS_SELECTOR, 'gaia-switch[name="powersave.enabled"]')
    _power_save_turn_on_auto_locator = (By.CSS_SELECTOR, 'select[name="powersave.threshold"]')

    def enable_power_save_mode(self):
        GaiaBinaryControl(self.marionette, self._power_save_checkbox_locator).enable()

    @property
    def screen_element(self):
        return self.marionette.find_element(*self._page_locator)

    def tap_turn_on_auto(self):
        element = Wait(self.marionette).until(
            expected.element_present(*self._power_save_turn_on_auto_locator))
        element.tap()

    def confirm_turnon_options(self):
        self.marionette.switch_to_frame()
        close_btn = self.marionette.find_element(By.CSS_SELECTOR, 'button.value-option-confirm')
        close_btn.tap()
        Wait(self.marionette).until(expected.element_not_displayed(close_btn))
        self.apps.switch_to_displayed_app()
        Wait(self.marionette).until(expected.element_displayed(*self._power_save_checkbox_locator))
