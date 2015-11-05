# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base


class Display(Base):

    _page_locator = (By.ID, 'display')
    _timeout_selector_locator = (By.NAME, "screen.timeout")
    _timeout_confirmation_button_locator = (By.CLASS_NAME, "value-option-confirm")

    @property
    def screen_element(self):
        return self.marionette.find_element(*self._page_locator)

    def tap_timeout_selector(self):
        self.marionette.find_element(*self._timeout_selector_locator).tap()
        self.marionette.switch_to_frame()
        element = Wait(self.marionette).until(
            expected.element_present(*self._timeout_confirmation_button_locator))
        Wait(self.marionette).until(expected.element_displayed(element))

    def tap_timeout_confirmation(self):
        self.marionette.find_element(*self._timeout_confirmation_button_locator).tap()
        self.apps.switch_to_displayed_app()
        element = Wait(self.marionette).until(
            expected.element_present(*self._timeout_selector_locator))
        Wait(self.marionette).until(expected.element_displayed(element))
