# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.base import Base


class HomescreenSettings(Base):

    _icon_layout_locator = (By.CSS_SELECTOR, '#homescreen div.icon-dialog')

    def select_icon_layout(self, value):
        self.wait_for_element_displayed(*self._icon_layout_locator)
        self.marionette.find_element(*self._icon_layout_locator).tap()
        self.select(value)
