# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.base import Base


class MessagingSettings(Base):
    
    _messaging_settings_locator = (By.CSS_SELECTOR, "h1[data-l10n-id='messagingSettings-header']")

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        self.wait_for_element_displayed(*self._messaging_settings_locator)

    def is_messaging_settings_displayed(self):
        return self.is_element_displayed(*self._messaging_settings_locator)
