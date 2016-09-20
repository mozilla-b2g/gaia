# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base
from gaiatest.apps.base import PageRegion
from gaiatest.form_controls.binarycontrol import GaiaBinaryControl
from gaiatest.apps.search.app import Browser


class TrackingDialog(PageRegion):

    _tracking_notice_locator = (By.ID, 'tracking-notice')
    _tracking_protection_toggle_locator = (By.ID, 'tracking-protection-toggle')
    _tracking_notice_learn_more_locator = (By.ID, 'tracking-notice-learn-more')
    _tracking_notice_confirm_locator = (By.ID, 'tracking-notice-confirm')

    def __init__(self, marionette):
        marionette.switch_to_frame()
        root = Wait(marionette).until(
            expected.element_present(*self._tracking_notice_locator))
        Wait(marionette).until(expected.element_displayed(root))
        PageRegion.__init__(self, marionette, root)

    @property
    def is_displayed(self):
        return self.root_element.is_displayed()

    @property
    def is_present(self):
        self.marionette.switch_to_frame()
        from gaiatest.apps.system.app import System
        return System(self.marionette).is_element_present(*self._tracking_notice_locator)

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
