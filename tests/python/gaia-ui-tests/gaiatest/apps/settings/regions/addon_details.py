# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import PageRegion
from gaiatest.form_controls.binarycontrol import GaiaBinaryControl


class AddonDetails(PageRegion):

    _details_page_locator = (By.ID, 'addon-details')
    _affected_apps_locator = (By.CLASS_NAME, 'addon-targets')
    _state_toggle_locator = (By.CSS_SELECTOR, '#addon-details .addon-details-body gaia-switch')
    _description_locator = (By.CSS_SELECTOR, '.addon-description-text')
    _reboot_required_locator = (By.CSS_SELECTOR, '[data-l10n-id="addon-reboot-required"]')

    def __init__(self, marionette):
        root = marionette.find_element(*self._details_page_locator)
        PageRegion.__init__(self, marionette, root)
        Wait(self.marionette).until(expected.element_displayed(
            self.root_element.find_element(*self._affected_apps_locator)))
        Wait(self.marionette).until(expected.element_displayed(
            self.root_element.find_element(*self._state_toggle_locator)))

    #  workaround for bug 1202246.  Need to call this method after frame switching
    def refresh_root_element(self):
        self.root_element = self.marionette.find_element(*self._details_page_locator)

    @property
    def _checkbox(self):
        return GaiaBinaryControl(self.marionette, self._state_toggle_locator)

    @property
    def is_enabled(self):
        return self._checkbox.is_checked

    def enable(self):
        self._checkbox.enable()

    def disable(self):
        self._checkbox.disable()

    @property
    def affected_apps(self):
        return self.root_element.find_element(*self._affected_apps_locator).text

    @property
    def description(self):
        return self.root_element.find_element(*self._description_locator).text
