# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import By, Wait, expected
from gaiatest.form_controls.form_control import Widget


class GaiaHeader(Widget):

    _back_button_locator = (By.CSS_SELECTOR, 'button.action-button')

    def go_back(self):
        Wait(self.marionette).until(expected.element_enabled(self.root_element) and
                                    expected.element_displayed(self.root_element))
        self.marionette.switch_to_shadow_root(self.root_element)
        self.marionette.find_element(*self._back_button_locator).tap()
        self.marionette.switch_to_shadow_root()
        Wait(self.marionette).until(expected.element_not_displayed(self.root_element))

    def go_back_and_exit(self, app=None, add_statusbar_height=True):
        Wait(self.marionette).until(expected.element_enabled(self.root_element) and
                                    expected.element_displayed(self.root_element))
        self.tap_element_from_system_app(self.root_element, add_statusbar_height=add_statusbar_height, x=20)
        app.wait_to_not_be_displayed()
        self.apps.switch_to_displayed_app()


class HTMLHeader(Widget):

    _back_button_locator = (By.CSS_SELECTOR, '.back')

    def go_back(self):
        back_button = self.root_element.find_element(*self._back_button_locator)
        Wait(self.marionette).until(expected.element_enabled(back_button) and
                                    expected.element_displayed(back_button))
        back_button.tap()
        Wait(self.marionette).until(expected.element_not_displayed(back_button))