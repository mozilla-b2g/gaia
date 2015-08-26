# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base


class Battery(Base):

    _power_save_checkbox_locator = (By.CSS_SELECTOR, 'gaia-switch[name="powersave.enabled"]')
    _power_save_turn_on_auto_locator = (By.CSS_SELECTOR, 'select[name="powersave.threshold"]')

    def toggle_power_save_mode(self):
        element = self.marionette.find_element(*self._power_save_checkbox_locator)
        initial_state = self.is_custom_element_checked(element)
        element.tap()
        self.wait_for_custom_element_checked_state(element, checked=not(initial_state))

    def tap_turn_on_auto(self):
        element = Wait(self.marionette).until(
            expected.element_present(*self._power_save_turn_on_auto_locator))
        element.tap()

    def select(self, match_string):
        # This needs to be duplicated from base.py because when we return from the frame
        # we don't return to the Settings app in its initial state,
        # so the wait for in its launch method times out

        # have to go back to top level to get the B2G select box wrapper
        self.marionette.switch_to_frame()

        Wait(self.marionette).until(
            expected.elements_present(
                By.CSS_SELECTOR, '.value-selector-container li'))

        options = self.marionette.find_elements(By.CSS_SELECTOR, '.value-selector-container li')
        close = self.marionette.find_element(By.CSS_SELECTOR, 'button.value-option-confirm')

        # loop options until we find the match
        for li in options:
            if match_string == li.text:
                li.tap()
                break
        else:
            raise Exception("Element '%s' could not be found in select wrapper" % match_string)

        close.tap()
        Wait(self.marionette).until(expected.element_not_displayed(close))

        # TODO we should find something suitable to wait for, but this goes too
        # fast against desktop builds causing intermittent failures
        time.sleep(0.2)

        # now back to app
        self.apps.switch_to_displayed_app()
