# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base


class BrowsingPrivacy(Base):

    _page_locator = (By.ID, 'browsingPrivacy')
    _clear_browsing_history_locator = (By.CSS_SELECTOR, 'button.clear-history-button')
    _clear_private_data_locator = (By.CSS_SELECTOR, 'button.clear-private-data-button')

    _clear_button_locator = (By.CSS_SELECTOR, 'button.clear-dialog-ok.danger')
    _cancel_button_locator = (By.CLASS_NAME, 'clear-dialog-cancel')

    def __init__(self, marionette):
        Base.__init__(self, marionette)

        Wait(self.marionette).until(
            expected.element_displayed(*self._clear_browsing_history_locator))

    @property
    def screen_element(self):
        return self.marionette.find_element(*self._page_locator)

    def tap_clear_browsing_history(self):
        self.marionette.find_element(*self._clear_browsing_history_locator).tap()
        Wait(self.marionette).until(expected.element_displayed(
            self.marionette.find_element(*self._clear_button_locator)))

    def tap_clear_private_data(self):
        self.marionette.find_element(*self._clear_private_data_locator).tap()
        Wait(self.marionette).until(expected.element_displayed(
            self.marionette.find_element(*self._clear_button_locator)))

    def tap_clear(self):
        clear = Wait(self.marionette).until(
            expected.element_present(*self._clear_button_locator))
        Wait(self.marionette).until(expected.element_displayed(clear))
        clear.tap()
        Wait(self.marionette).until(expected.element_displayed(
            self.marionette.find_element(*self._page_locator)))

    def cancel_clear(self):
        self.marionette.find_element(*self._cancel_button_locator).tap()
        Wait(self.marionette).until(expected.element_displayed(
            self.marionette.find_element(*self._page_locator)))
