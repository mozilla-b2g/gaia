# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base


class InternetSharing(Base):

    _page_locator = (By.ID, 'hotspot')
    _hotspot_settings_locator = (By.ID, "hotspot-settings-section")

    @property
    def screen_element(self):
        return self.marionette.find_element(*self._page_locator)

    def tap_hotspot_settings(self):
        self.marionette.find_element(*self._hotspot_settings_locator).tap()
        return self.HotspotSettings(self.marionette)


    class HotspotSettings(Base):

        _page_locator = (By.ID, 'hotspot-wifiSettings')
        _security_selector_locator = (By.CLASS_NAME, 'security-selector')
        _security_selector_ok_locator = (By.CLASS_NAME, 'value-option-confirm')

        def __init__(self, marionette):
            Base.__init__(self, marionette)
            Wait(self.marionette).until(
                expected.element_displayed(*self._security_selector_locator))

        @property
        def screen_element(self):
            return self.marionette.find_element(*self._page_locator)

        def tap_security_settings(self):
            self.marionette.find_element(*self._security_selector_locator).tap()
            self.marionette.switch_to_frame()
            Wait(self.marionette).until(
                expected.element_displayed(*self._security_selector_ok_locator))

        def confirm_security_settings(self):
            self.marionette.find_element(*self._security_selector_ok_locator).tap()
            self.apps.switch_to_displayed_app()
            Wait(self.marionette).until(
                expected.element_displayed(*self._security_selector_locator))

