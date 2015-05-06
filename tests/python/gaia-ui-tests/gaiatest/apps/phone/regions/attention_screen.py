# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base


class AttentionScreen(Base):

    _message_locator = (By.ID, 'message')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        Wait(self.marionette).until(
            expected.element_displayed(*self._message_locator))

    @property
    def message(self):
        return self.marionette.find_element(*self._message_locator).text
