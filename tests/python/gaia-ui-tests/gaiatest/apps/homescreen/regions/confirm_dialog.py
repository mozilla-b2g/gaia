# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time
from marionette.by import By
from gaiatest.apps.base import Base


class ConfirmDialog(Base):

    _confirm_button_locator = (By.CSS_SELECTOR, 'gaia-confirm .confirm')

    def tap_confirm(self):
        # TODO add a good wait here when Bug 1008961 is resolved
        time.sleep(1)
        self.wait_for_element_displayed(*self._confirm_button_locator)
        self.marionette.find_element(*self._confirm_button_locator).tap()
