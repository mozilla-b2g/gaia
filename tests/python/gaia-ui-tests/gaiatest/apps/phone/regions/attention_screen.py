# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.phone.app import Phone


class AttentionScreen(Phone):

    _message_locator = (By.ID, 'message')

    def __init__(self, marionette):
        Phone.__init__(self, marionette)

    @property
    def message(self):
        return self.marionette.find_element(*self._message_locator).text
