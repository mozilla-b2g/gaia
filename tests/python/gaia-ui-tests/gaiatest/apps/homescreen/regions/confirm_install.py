# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base


class ConfirmInstall(Base):

        _confirm_install_button_locator = (By.ID, 'app-install-install-button')

        def tap_confirm(self):
            # TODO add a good wait here when Bug 1008961 is resolved
            time.sleep(1)
            self.marionette.switch_to_frame()
            confirm = Wait(self.marionette).until(expected.element_present(
                *self._confirm_install_button_locator))
            Wait(self.marionette).until(expected.element_displayed(confirm))
            confirm.tap()
