# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base


class MediaStorage(Base):

    _page_locator = (By.ID, 'mediaStorage')
    _internal_storage_header_locator = (By.CSS_SELECTOR, '[data-l10n-id="storage-name-internal"]')
    _external_storage_header_locator = (By.CSS_SELECTOR, '[data-l10n-id="storage-name-external-0"]')
    _advanced_header_locator = (By.CSS_SELECTOR, '[data-l10n-id="advanced"]')
    _music_size_locator = (By.CSS_SELECTOR, '.color-music > a > .size')
    _pictures_size_locator = (By.CSS_SELECTOR, '.color-pictures > a > .size')
    _movies_size_locator = (By.CSS_SELECTOR, '.color-videos > a > .size')

    _format_internal_selector_locator = (By.CSS_SELECTOR, '[data-l10n-id="format-sdcard-internal"]')
    _format_sd_selector_locator = (By.CSS_SELECTOR, '[data-l10n-id="format-sdcard-external-0"]')
    _format_dialog_cancel_locator = (By.ID, 'format-sdcard-cancel-btn')
    _format_dialog_confirm_locator = (By.ID, 'format-sdcard-ok-btn')

    _eject_sd_selector_locator = (By.CSS_SELECTOR, '[data-l10n-id="eject-sdcard-external-0"]')
    _eject_dialog_cancel_locator = (By.ID, 'format-sdcard-cancel-btn')
    _eject_dialog_confirm_locator = (By.ID, 'format-sdcard-ok-btn')

    _media_location_selector_locator = (By.ID, 'defaultMediaLocation')
    _default_change_cancel_locator = (By.ID, 'default-location-cancel-btn')
    _default_change_confirm_locator = (By.ID, 'default-location-change-btn')
    _default_change_ok_button_locator = (By.CLASS_NAME, "value-option-confirm")

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        # check for the presence of internal storage section and advanced option section
        Wait(self.marionette).until(expected.element_displayed(*self._internal_storage_header_locator))
        Wait(self.marionette).until(expected.element_displayed(*self._advanced_header_locator))

    @property
    def screen_element(self):
        return self.marionette.find_element(*self._page_locator)

    @property
    def music_size(self):
        return self.marionette.find_element(*self._music_size_locator).text

    @property
    def pictures_size(self):
        return self.marionette.find_element(*self._pictures_size_locator).text

    @property
    def movies_size(self):
        return self.marionette.find_element(*self._movies_size_locator).text

    def tap_format_internal_storage(self):
        self.marionette.find_element(*self._format_internal_selector_locator).tap()
        Wait(self.marionette).until(expected.element_displayed(*self._format_dialog_confirm_locator))

    def tap_format_SD(self):
        self.marionette.find_element(*self._format_sd_selector_locator).tap()
        Wait(self.marionette).until(expected.element_displayed(*self._format_dialog_confirm_locator))

    def confirm_format_storage(self):
        self.marionette.find_element(*self._format_dialog_confirm_locator).tap()
        Wait(self.marionette).until(expected.element_displayed(*self._format_internal_selector_locator))

    def cancel_format_storage(self):
        self.marionette.find_element(*self._format_dialog_cancel_locator).tap()
        Wait(self.marionette).until(expected.element_displayed(*self._format_internal_selector_locator))

    def tap_eject_SD(self):
        self.marionette.find_element(*self._eject_sd_selector_locator).tap()
        Wait(self.marionette).until(expected.element_displayed(*self._eject_dialog_confirm_locator))

    def confirm_eject_SD(self):
        self.marionette.find_element(*self._eject_dialog_confirm_locator).tap()
        Wait(self.marionette).until(expected.element_displayed(*self._eject_sd_selector_locator))

    def cancel_eject_SD(self):
        self.marionette.find_element(*self._eject_dialog_cancel_locator).tap()
        Wait(self.marionette).until(expected.element_displayed(*self._eject_sd_selector_locator))

    def tap_select_media_location(self):
        self.marionette.find_element(*self._media_location_selector_locator).tap()
        Wait(self.marionette).until(expected.element_displayed(*self._default_change_confirm_locator))

    def confirm_select_media_location(self):
        self.marionette.find_element(*self._default_change_confirm_locator).tap()
        self.marionette.switch_to_frame()
        Wait(self.marionette).until(expected.element_displayed(*self._default_change_ok_button_locator))

    def pick_media_location(self,location):
        if location is 'Internal':
            _selection_locator = (By.CSS_SELECTOR, '[data-option-index="0"]')
        elif location is 'SD Card':
            _selection_locator = (By.CSS_SELECTOR, '[data-option-index="1"]')
        self.marionette.find_element(*_selection_locator).tap()
        self.marionette.find_element(*self._default_change_ok_button_locator).tap()
        self.apps.switch_to_displayed_app()
        Wait(self.marionette).until(expected.element_displayed(*self._media_location_selector_locator))

