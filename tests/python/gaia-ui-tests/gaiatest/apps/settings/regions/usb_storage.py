# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base
from gaiatest.apps.base import PageRegion
from gaiatest.form_controls.binarycontrol import GaiaBinaryControl


class USBStorage(Base):

    _page_locator = (By.ID, 'usbStorage')
    _usb_storage_checkbox_locator = (By.CSS_SELECTOR, '#usbStorage gaia-switch.ums-switch')
    _usb_storage_confirm_button_locator = (By.CSS_SELECTOR, 'gaia-confirm button[data-l10n-id="ok"]')
    _usb_storage_cancel_button_locator = (By.CSS_SELECTOR, 'gaia-confirm button[data-l10n-id="cancel"]')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        Wait(self.marionette).until(expected.element_displayed(*self._page_locator))

    @property
    def screen_element(self):
        return self.marionette.find_element(*self._page_locator)

    def enable_usb_storage(self):
        self._usb_checkbox.enable()

    @property
    def enabled(self):
        return self._usb_checkbox.is_checked

    @property
    def _usb_checkbox(self):
        return GaiaBinaryControl(self.marionette, self._usb_storage_checkbox_locator)

    def confirm_usb_storage(self):
        element = Wait(self.marionette).until(
            expected.element_present(*self._usb_storage_confirm_button_locator))
        Wait(self.marionette).until(expected.element_displayed(element))
        element.tap()
        Wait(self.marionette).until(lambda m: self.enabled is True)

    def cancel_usb_storage(self):
        element = Wait(self.marionette).until(
            expected.element_present(*self._usb_storage_cancel_button_locator))
        Wait(self.marionette).until(expected.element_displayed(element))
        element.tap()
        Wait(self.marionette).until(lambda m: self.enabled is False)
