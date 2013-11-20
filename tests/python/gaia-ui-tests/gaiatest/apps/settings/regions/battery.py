# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.base import Base


class Battery(Base):

    _power_save_checkbox_locator = (By.CSS_SELECTOR, '.uninit[name*="powersave"]')
    _power_save_label_locator = (By.CSS_SELECTOR, 'span[data-l10n-id="powerSaveMode"]')

    def toggle_power_save_mode(self):
        checkbox = self.marionette.find_element(*self._power_save_checkbox_locator)
        label = self.marionette.find_element(*self._power_save_label_locator)
        checkbox_state = checkbox.is_selected()
        label.tap()
        self.wait_for_condition(lambda m: checkbox_state is not checkbox.is_selected())
