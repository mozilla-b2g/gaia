# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.base import Base


class Bluetooth(Base):

    _bluetooth_checkbox_locator = (By.CSS_SELECTOR, '#bluetooth-status input')
    _bluetooth_label_locator = (By.CSS_SELECTOR, '#bluetooth-status span')

    @property
    def is_bluetooth_enabled(self):
        return self.marionette.find_element(*self._bluetooth_checkbox_locator).get_attribute('checked')

    def enable_bluetooth(self):
        self.marionette.find_element(*self._bluetooth_label_locator).tap()
        self.wait_for_condition(lambda m: self.is_bluetooth_enabled)
