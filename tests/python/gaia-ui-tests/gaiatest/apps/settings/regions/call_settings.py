# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time
from marionette.by import By
from gaiatest.apps.base import Base


class CallSettings(Base):

    _call_waiting_locator = (By.CSS_SELECTOR, 'span[data-l10n-id="callWaiting"]')
    _menuItem_call_sim1 = (By.ID, "menuItem-call-sim1")
    _menuItem_call_sim2 = (By.ID, "menuItem-call-sim2")
    _back_button_locator = (By.CSS_SELECTOR, '.current header > a')

    def select_sim(self, sim):
        if sim == 1:
            self.wait_for_element_displayed(*self._menuItem_call_sim1)
            self.marionette.find_element(*self._menuItem_call_sim1).tap()
        else:
            self.wait_for_element_displayed(*self._menuItem_call_sim2)
            self.marionette.find_element(*self._menuItem_call_sim2).tap()

    def go_back(self):
        self.marionette.find_element(*self._back_button_locator).tap()
 
    @property
    def is_call_waiting_exist(self):
        time.sleep(1)
        return self.marionette.find_element(*self._call_waiting_locator).is_displayed()
