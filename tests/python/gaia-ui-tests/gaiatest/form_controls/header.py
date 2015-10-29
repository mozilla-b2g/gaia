# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import By, Wait, expected
from gaiatest.form_controls.form_control import Widget


class GaiaHeader(Widget):

    _back_button_locator = (By.CSS_SELECTOR, 'button.action-button')
    _close_button_locator = (By.CSS_SELECTOR, 'button[type="reset"]')
    _h1_locator = (By.CSS_SELECTOR, 'h1')

    @property
    def text(self):
        self._wait_to_be_ready()
        return self.root_element.find_element(*self._h1_locator).text

    def _wait_to_be_ready(self):
        Wait(self.marionette).until(expected.element_enabled(self.root_element) and
                                    expected.element_displayed(self.root_element))
        Wait(self.marionette).until(lambda m: self.root_element.rect['x'] == 0)

    def tap(self):
        self._wait_to_be_ready()
        self.root_element.tap()

    def go_back(self, app=None, exit_app=False, statusbar=False):
        self._wait_to_be_ready()
        self.marionette.switch_to_shadow_root(self.root_element)
        element = self.marionette.find_element(*self._back_button_locator)
        _back_button_present = True

        if not element.is_displayed(): # This header has a close button instead of a back button
            self.marionette.switch_to_shadow_root()
            element = self.root_element.find_element(*self._close_button_locator)
            _back_button_present = False

        if exit_app:
            self.tap_element_from_system_app(element, statusbar)
            app.wait_to_not_be_displayed()
            self.apps.switch_to_displayed_app()
        else:
            element.tap()
            if _back_button_present:
                self.marionette.switch_to_shadow_root()
            Wait(self.marionette).until(expected.element_not_displayed(self.root_element))
