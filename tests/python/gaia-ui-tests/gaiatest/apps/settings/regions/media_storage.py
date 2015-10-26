# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base
from gaiatest.apps.base import PageRegion

class MediaStorage(Base):

    _page_locator = (By.ID, 'mediaStorage')
    _advanced_header_locator = (By.CSS_SELECTOR, '[data-l10n-id="advanced"]')

    _internal_storage_locator = (By.CSS_SELECTOR, '[data-id="internal"] + ul')
    _external0_storage_locator = (By.CSS_SELECTOR, '[data-id="external-0"] + ul')

    _internal_storage_header_locator = (By.CSS_SELECTOR, '[data-l10n-id="storage-name-internal"]')
    _external0_storage_header_locator = (By.CSS_SELECTOR, '[data-l10n-id="storage-name-external-0"]')

    _media_location_selector_locator = (By.ID, 'defaultMediaLocation')
    _default_change_cancel_locator = (By.ID, 'default-location-cancel-btn')
    _default_change_confirm_locator = (By.ID, 'default-location-change-btn')
    _default_change_ok_button_locator = (By.CLASS_NAME, 'value-option-confirm')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        # check for the presence of internal storage section and advanced option section
        Wait(self.marionette).until(expected.element_displayed(*self._internal_storage_header_locator))
        Wait(self.marionette).until(expected.element_displayed(*self._advanced_header_locator))

    @property
    def screen_element(self):
        return self.marionette.find_element(*self._page_locator)

    @property
    def internal_storage(self):
        element = self.marionette.find_element(*self._internal_storage_locator)
        from gaiatest.apps.settings.regions.storage_region import StorageRegion
        return StorageRegion(self.marionette, element)

    @property
    def external_storage0(self):
        element = self.marionette.find_element(*self._external0_storage_locator)
        from gaiatest.apps.settings.regions.storage_region import StorageRegion
        return StorageRegion(self.marionette, element)

    @property
    def default_media_location(self):
        element = self.marionette.find_element(*self._media_location_selector_locator)
        return self.marionette.execute_script("""
            return arguments[0].wrappedJSObject.selectedIndex;
        """, [element]);

    def tap_select_media_location(self):
        self.marionette.find_element(*self._media_location_selector_locator).tap()
        Wait(self.marionette).until(expected.element_displayed(*self._default_change_confirm_locator))

    def confirm_select_media_location(self):
        self.marionette.find_element(*self._default_change_confirm_locator).tap()
        self.marionette.switch_to_frame()
        Wait(self.marionette).until(expected.element_displayed(*self._default_change_ok_button_locator))

    def pick_media_location(self,location):
        if location == 'Internal':
            _selection_locator = (By.CSS_SELECTOR, '[data-option-index="0"]')
        elif location == 'SD Card':
            _selection_locator = (By.CSS_SELECTOR, '[data-option-index="1"]')
        else:
            raise AttributeError('{} is not a media supported in the test'.format(location))
        element = Wait(self.marionette).until(expected.element_present(*_selection_locator))
        Wait(self.marionette).until(expected.element_displayed(element))
        element.tap()
        self.marionette.find_element(*self._default_change_ok_button_locator).tap()
        self.apps.switch_to_displayed_app()
        Wait(self.marionette).until(expected.element_displayed(*self._media_location_selector_locator))
