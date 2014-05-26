# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.base import Base
import time


class ConfirmInstall(Base):

        _confirm_install_button_locator = (By.ID, 'app-install-install-button')

        def tap_confirm(self):
            # TODO add a good wait here when Bug 1008961 is resolved
            time.sleep(1)
            self.wait_for_element_displayed(*self._confirm_install_button_locator)
            self.marionette.find_element(*self._confirm_install_button_locator).tap()
