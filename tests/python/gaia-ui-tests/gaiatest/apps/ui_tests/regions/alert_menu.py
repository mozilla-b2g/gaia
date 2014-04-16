# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.base import Base


class AlertPromptMenuPage(Base):

    _frame_locator = (By.CSS_SELECTOR, '#test-iframe[src*="alert"]')
    _alert_button_locator = (By.ID, 'button1')

    def __init__(self, marionette):
        Base.__init__(self, marionette)

    def switch_to_frame(self):
        self.wait_for_element_displayed(*self._frame_locator)
        alert_menu_page_iframe = self.marionette.find_element(*self._frame_locator)
        self.marionette.switch_to_frame(alert_menu_page_iframe)

    def tap_alert_button(self):
        self.wait_for_element_displayed(*self._alert_button_locator)
        self.marionette.find_element(*self._alert_button_locator).tap()

        from gaiatest.apps.system.regions.modal import ModalAlert
        return ModalAlert(self.marionette)
