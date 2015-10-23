# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base
from gaiatest.apps.base import PageRegion


class BrowsingPrivacy(Base):

    _page_locator = (By.ID, 'browsingPrivacy')
    _clear_browsing_history_locator = (By.CSS_SELECTOR, 'button.clear-history-button')
    _clear_private_data_locator = (By.CSS_SELECTOR, 'button.clear-private-data-button')

    def __init__(self, marionette):
        Base.__init__(self, marionette)

        Wait(self.marionette).until(
            expected.element_displayed(*self._clear_browsing_history_locator))

    @property
    def screen_element(self):
        return self.marionette.find_element(*self._page_locator)

    def clear_browsing_history(self):
        self.marionette.find_element(*self._clear_browsing_history_locator).tap()
        return ClearHistoryDialog(self.marionette)

    def clear_private_data(self):
        self.marionette.find_element(*self._clear_private_data_locator).tap()
        return ClearHistoryDialog(self.marionette)


class ClearHistoryDialog(PageRegion):

    _root_locator = (By.ID, 'settings-confirm-dialog')
    _cancel_locator = (By.CSS_SELECTOR, '[data-l10n-id="cancel"]')
    _clear_delete_locator = (By.CSS_SELECTOR, '.danger')

    def __init__(self, marionette):
        element = marionette.find_element(*self._root_locator)
        PageRegion.__init__(self, marionette, element)
        Wait(self.marionette).until(lambda m: element.is_displayed())

    # workaround for bug 1202246.  Need to call this method after frame switching
    def refresh_root_element(self):
        self.root_element = self.marionette.find_element(*self._root_locator)

    def confirm_clear(self):
        element = self.root_element.find_element(*self._clear_delete_locator)
        element.tap()
        Wait(self.marionette).until(lambda m: not self.root_element.is_displayed())

    def cancel_clear(self):
        element = self.root_element.find_element(*self._cancel_locator)
        element.tap()
        Wait(self.marionette).until(lambda m: not self.root_element.is_displayed())
