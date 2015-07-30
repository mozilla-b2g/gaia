# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base


class BrowsingPrivacy(Base):

    _clear_browsing_history_locator = (By.CSS_SELECTOR, 'button.clear-history-button')
    _clear_button_locator = (By.CSS_SELECTOR, 'button.clear-dialog-ok.danger')

    def __init__(self, marionette):
        Base.__init__(self, marionette)

        Wait(self.marionette).until(
            expected.element_displayed(*self._clear_browsing_history_locator))

    def tap_clear_browsing_history(self):
        self.marionette.find_element(*self._clear_browsing_history_locator).tap()

    def tap_clear(self):
        clear = Wait(self.marionette).until(
            expected.element_present(*self._clear_button_locator))
        Wait(self.marionette).until(expected.element_displayed(clear))
        clear.tap()
