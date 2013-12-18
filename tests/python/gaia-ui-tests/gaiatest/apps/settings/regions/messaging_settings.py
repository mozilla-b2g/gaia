# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.base import Base


class MessagingSettings(Base):

    _messaging_settings_locator = (By.ID, 'messaging')

    @property
    def is_messaging_settings_displayed(self):
        return self.marionette.find_element(*self._messaging_settings_locator)
