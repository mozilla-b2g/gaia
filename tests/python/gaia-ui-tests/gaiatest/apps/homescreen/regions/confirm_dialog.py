# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.base import Base


class ConfirmDialog(Base):

    _confirm_button_locator = (By.ID, 'confirm-dialog-confirm-button')

    def tap_confirm(self):
        self.wait_for_element_displayed(*self._confirm_button_locator)
        self.marionette.find_element(*self._confirm_button_locator).tap()
