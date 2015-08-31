# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait
from gaiatest.apps.base import PageRegion


class SmsOptions(PageRegion):

    _root_locator = (By.CSS_SELECTOR, 'form.visible')

    def __init__(self, marionette):
        root = marionette.find_element(*self._root_locator)
        PageRegion.__init__(self, marionette, root)
        self.wait_for_panel_to_appear()

    def wait_for_panel_to_appear(self):
        Wait(self.marionette).until(lambda m: self.root_element.is_displayed() and self.root_element.rect['y'] == 0)

    def wait_for_panel_to_hide(self):
        Wait(self.marionette).until(expected.element_not_displayed(self.root_element))

    def _tap_and_wait_until_hidden(self, locator):
        self.root_element.find_element(*locator).tap()
        self.wait_for_panel_to_hide()
        from gaiatest.apps.messages.app import Messages
        return Messages(self.marionette)


class ThreadOptions(SmsOptions):

    _select_button_locator = (By.CSS_SELECTOR, 'button[data-l10n-id="selectThreads-label"]')

    def select_threads(self):
        return self._tap_and_wait_until_hidden(self._select_button_locator)


class DraftOptions(SmsOptions):

    _save_button_locator = (By.CSS_SELECTOR, 'button[data-l10n-id="save-as-draft"]')

    def save(self):
        return self._tap_and_wait_until_hidden(self._save_button_locator)


class ConfirmDeletionOptions(SmsOptions):

    _confirm_delete_button_locator = (By.CSS_SELECTOR, 'button[data-l10n-id="delete"]')

    def confirm_delete(self):
        return self._tap_and_wait_until_hidden(self._confirm_delete_button_locator)
