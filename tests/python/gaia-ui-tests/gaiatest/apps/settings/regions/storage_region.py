# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import PageRegion

class StorageRegion(PageRegion):
    _music_size_locator = (By.CSS_SELECTOR, '[data-l10n-id="music-space"] + [data-l10n-id="storageSize"]')
    _movies_size_locator = (By.CSS_SELECTOR, '[data-l10n-id="videos-space"] + [data-l10n-id="storageSize"]')
    _pictures_size_locator = (By.CSS_SELECTOR, '[data-l10n-id="pictures-space"] + [data-l10n-id="storageSize"]')
    _format_locator = (By.CSS_SELECTOR, '[data-l10n-id^="format-sdcard"]')
    _eject_locator = (By.CSS_SELECTOR, '[data-l10n-id^="eject-sdcard-external-0"]')

    _format_dialog_cancel_locator = (By.CSS_SELECTOR, 'button[type="reset"]')
    _format_dialog_confirm_locator = (By.CSS_SELECTOR, 'button[type="submit"]')
    _eject_dialog_cancel_locator = (By.CSS_SELECTOR, 'button[type="reset"]')
    _eject_dialog_confirm_locator = (By.CSS_SELECTOR, 'button[type="submit"]')

    @property
    def music_size(self):
        return self.root_element.find_element(*self._music_size_locator).text

    @property
    def movies_size(self):
        return self.root_element.find_element(*self._movies_size_locator).text

    @property
    def pictures_size(self):
        return self.root_element.find_element(*self._pictures_size_locator).text

    @property
    def _format_button(self):
        return self.root_element.find_element(*self._format_locator)

    @property
    def _eject_button(self):
        return self.root_element.find_element(*self._eject_locator)

    def tap_format(self):
        self.marionette.execute_script('arguments[0].scrollIntoView(false);', [self._format_button])
        self._format_button.tap()
        Wait(self.marionette).until(expected.element_displayed(*self._format_dialog_confirm_locator))

    def confirm_format(self):
        self.marionette.find_element(*self._format_dialog_confirm_locator).tap()
        Wait(self.marionette).until(expected.element_displayed(self._format_button))

    def cancel_format(self):
        self.marionette.find_element(*self._format_dialog_cancel_locator).tap()
        Wait(self.marionette).until(expected.element_displayed(self._format_button))

    def tap_eject(self):
        self.marionette.execute_script('arguments[0].scrollIntoView(false);', [self._eject_button])
        self._eject_button.tap()
        Wait(self.marionette).until(expected.element_displayed(*self._eject_dialog_confirm_locator))

    def confirm_eject(self):
        self.marionette.find_element(*self._eject_dialog_confirm_locator).tap()
        Wait(self.marionette).until(expected.element_not_displayed(*self._eject_dialog_confirm_locator))

    def cancel_eject(self):
        self.marionette.find_element(*self._eject_dialog_cancel_locator).tap()
        Wait(self.marionette).until(expected.element_displayed(self._eject_button))
