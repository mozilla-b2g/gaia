# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base
from gaiatest.apps.base import PageRegion
from gaiatest.form_controls.binarycontrol import GaiaBinaryControl
from gaiatest.apps.search.regions.browser import Browser

class FullScreenDialog(PageRegion):

    _fullscreen_dialog_locator = (By.ID, 'fullscreen-dialog-overlay')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        self.marionette.switch_to_frame()
        self.root_element = Wait(self.marionette).until(
            expected.element_present(*self._fullscreen_dialog_locator))

    @property
    def is_empty(self):
        return self.marionette.execute_script("""
            return arguments[0].innerHTML.length == 0
            """, [self.root_element])

class TrackingDialog(PageRegion):

    _tracking_notice_locator = (By.ID, 'tracking-notice')
    _tracking_protection_toggle_locator = (By.ID, 'tracking-protection-toggle')
    _tracking_notice_learn_more_locator = (By.ID, 'tracking-notice-learn-more')
    _tracking_notice_confirm_locator = (By.ID, 'tracking-notice-confirm')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        self.marionette.switch_to_frame()
        self.root_element = Wait(self.marionette).until(
            expected.element_present(*self._tracking_notice_locator))
        Wait(self.marionette).until(
            expected.element_displayed(self.root_element))

    @property
    def is_displayed(self):
        return self.root_element.is_displayed()

    def open_learn_more(self):
        self.root_element.find_element(*self._tracking_notice_learn_more_locator).tap()
        return Browser(self.marionette)

    @property
    def _tracking_protection_switch(self):
        return GaiaBinaryControl(
            self.marionette, self.root_element.find_element(*self._tracking_protection_toggle_locator))

    @property
    def is_tracking_protection_enabled(self):
        self._tracking_protection_switch.is_checked

    def enable_tracking_protection(self):
        self._tracking_protection_switch.enable()

    def disable_tracking_protection(self):
        self._tracking_protection_switch.disable()

    def close_tracking_protection_dialog(self):
        self.root_element.find_element(*self._tracking_notice_confirm_locator).tap()
        return Browser(self.marionette)
