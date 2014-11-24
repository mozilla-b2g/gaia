# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time
from marionette.by import By
from marionette.wait import Wait
from marionette import expected
from gaiatest.apps.base import Base


class Battery(Base):

    _power_save_checkbox_locator = (By.CSS_SELECTOR, '.uninit[name*="powersave"]')
    _power_save_label_locator = (By.CSS_SELECTOR, 'span[data-l10n-id="powerSaveMode"]')
    _power_save_turn_on_auto_locator = (By.CSS_SELECTOR, 'select[name="powersave.threshold"]')

    def toggle_power_save_mode(self):
        checkbox = self.marionette.find_element(*self._power_save_checkbox_locator)
        label = self.marionette.find_element(*self._power_save_label_locator)
        checkbox_state = checkbox.is_selected()
        label.tap()
        self.wait_for_condition(lambda m: checkbox_state is not checkbox.is_selected())

    def tap_turn_on_auto(self):
        power_save_turn_on_auto = Wait(self.marionette).until(expected.element_present(*self._power_save_turn_on_auto_locator))
        power_save_turn_on_auto.tap()

    def select(self, match_string):
        # This needs to be duplicated from base.py because when we return from the frame
        # we don't return to the Settings app in its initial state,
        # so the wait for in its launch method times out

        # have to go back to top level to get the B2G select box wrapper
        self.marionette.switch_to_frame()

        self.wait_for_condition(
            lambda m: len(self.marionette.find_elements(By.CSS_SELECTOR, '.value-selector-container li')) > 0)

        options = self.marionette.find_elements(By.CSS_SELECTOR, '.value-selector-container li')
        close_button = self.marionette.find_element(By.CSS_SELECTOR, 'button.value-option-confirm')

        # loop options until we find the match
        for li in options:
            if match_string == li.text:
                li.tap()
                break
        else:
            raise Exception("Element '%s' could not be found in select wrapper" % match_string)

        close_button.tap()
        self.wait_for_element_not_displayed(By.CSS_SELECTOR, 'button.value-option-confirm')

        # TODO we should find something suitable to wait for, but this goes too
        # fast against desktop builds causing intermittent failures
        time.sleep(0.2)

        # now back to app
        self.apps.switch_to_displayed_app()
