# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base


class PinDialog(Base):


    _pin_site_to_home_screen = (By.CSS_SELECTOR, 'button[data-action="pin-site"]')
    _pin_page_to_home_screen = (By.CSS_SELECTOR, 'button[data-action="pin-page"]')

    def __init__(self, marionette):
        Base.__init__(self, marionette)


    def tap_pin_site_to_home_screen(self):
        self.marionette.switch_to_frame()
        element = Wait(self.marionette).until(expected.element_present(
            *self._pin_site_to_home_screen))
        Wait(self.marionette).until(expected.element_displayed(element))
        # This sleep is necessary for the button to react to the tap call
        time.sleep(0.2)
        element.tap()

    def tap_pin_page_to_home_screen(self):
        self.marionette.switch_to_frame()
        element = Wait(self.marionette).until(expected.element_present(
            *self._pin_page_to_home_screen))
        Wait(self.marionette).until(expected.element_displayed(element))
        # This sleep is necessary for the button to react to the tap call
        time.sleep(0.2)
        element.tap()
